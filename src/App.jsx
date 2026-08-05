import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildDeck, shuffle } from './cards.js';

const BUILD_VERSION = __BUILD_VERSION__;

const CRUSADE_POOL = { 2: 16, 3: 16, 4: 20, 5: 23, 6: 25 };
const RELIC_VP = 6;
const RELIC_CARDS = ['hg1', 'hg2', 'hg3'];
const CITY_BACKGROUNDS = Object.entries(import.meta.glob('/public/assets/ui/c*.webp', { eager: true, query: '?url', import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => url);

function freshGame(botCount, language = 'ru', gameSpeed = 5) {
  const deck = shuffle(buildDeck());
  const names = language === 'en' ? ['You', ...Array.from({ length: 5 }, (_, index) => `B${index + 1}`)] : ['Вы', ...Array.from({ length: 5 }, (_, index) => `Б${index + 1}`)];
  const players = Array.from({ length: botCount + 1 }, (_, id) => ({ id, name: names[id], bot: id > 0, city: [], hand: [], crusade: 0, relics: [] }));
  shuffle(CITY_BACKGROUNDS).slice(0, players.length).forEach((background, index) => { players[index].background = background; });
  return {
    deck: deck.slice(3),
    crossroads: deck.slice(0, 3),
    players,
    current: 0,
    phase: 'draw-deck',
    infections: [],
    discard: [],
    relicDeck: shuffle([...RELIC_CARDS]),
    forcedPlay: null,
    pendingChoice: null,
    crusadePool: CRUSADE_POOL[players.length],
    crusadeLimit: CRUSADE_POOL[players.length],
    crusadeRound: 1,
    history: [{ label: 'начало', scores: players.map(score), crusade: players.map(() => 0) }],
    log: ['В городе пахнет дымом, навозом и возможностью.'],
    ended: false,
    language,
    gameSpeed,
  };
}

function score(player) {
  return residentScore(player) + relicScore(player);
}

function residentScore(player) {
  const peasants = player.city.filter((card) => card.id === 'peasant').length;
  const monks = player.city.filter((card) => card.id === 'monk').length;
  const traders = player.city.filter((card) => card.id === 'merchant').length;
  const negativeResidents = player.city.filter((card) => card.vp < 0).length;
  return player.city.reduce((total, card) => total + card.vp
    + (card.id === 'peasant' ? peasants - 1 : 0)
    - (card.id === 'monk' ? (monks - 1) * 2 : 0)
    - (card.id === 'hermit' ? player.city.length - 1 : 0)
    + (card.id === 'devil' ? negativeResidents * 2 : 0)
    - (card.id === 'merchant' && traders > 1 ? card.vp : 0), 0);
}

function relicScore(player) {
  return player.relics.length * RELIC_VP;
}

function residentCount(player) {
  return player.city.filter((card) => card.id !== 'corpse').length;
}

const WOMEN = new Set(['lady', 'harlot', 'devka', 'witch']);
const epidemicPriority = (card, infection) => card.id === 'syphilis'
  ? (infection?.syphilisBoosted ? 'усиленная эпидемия' : 'обычная эпидемия')
  : ({ cholera: 'сначала простолюдины', leprosy: 'сначала священники', malaria: 'сначала дворяне', black_pox: 'сначала высокий иммунитет', bubonic_plague: 'по 2 жертвы в первый ход' }[card.id] || 'обычный порядок');

function recordHistory(game, label) {
  game.history.push({ label, scores: game.players.map(score), crusade: game.players.map((player) => player.crusade) });
}

function Card({ card, small = false, onClick, onSelect, selected, targetable = false, selectable = false, selectLabel = 'Select', faceDown = false, directClick = false }) {
  const [zoomed, setZoomed] = useState(false);
  const previewKey = card?.uid || 'face-down';
  useEffect(() => {
    const closeOtherPreview = (event) => {
      if (event.detail !== previewKey) setZoomed(false);
    };
    window.addEventListener('card-preview-open', closeOtherPreview);
    return () => window.removeEventListener('card-preview-open', closeOtherPreview);
  }, [previewKey]);
  const handleClick = (event) => {
    event.stopPropagation();
    if (directClick) onClick?.(event);
    else if (!zoomed) {
      window.dispatchEvent(new CustomEvent('card-preview-open', { detail: previewKey }));
      setZoomed(true);
    }
  };
  if (faceDown) return <button className={`card back ${small ? 'small' : ''} ${zoomed ? 'zoomed' : ''}`} onClick={handleClick} aria-label="Колода" />;
  const confirm = (event) => {
    event.stopPropagation();
    setZoomed(false);
    (onSelect || onClick)?.(event);
  };
  return <>
    <button className={`card ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${targetable ? 'targetable' : ''} ${card.epidemic ? 'epidemic' : ''}`} onClick={handleClick} title={`${card.title}: ${card.effect}`}>
      <img src={card.art} alt={card.title} />
    </button>
    {zoomed && createPortal(<div className="card-modal" role="dialog" aria-label={card.title} onClick={() => setZoomed(false)}>
      <div className="card-modal-content">
        <button className="card card-modal-card" onClick={() => setZoomed(false)} title="Закрыть просмотр"><img src={card.art} alt={card.title} /></button>
        {selectable && <button className="card-select" onClick={confirm}>{selectLabel}</button>}
      </div>
    </div>, document.body)}
  </>;
}

function City({ player, active, selectedCard, onPlace, infections = [], plaguePreview, setPlaguePreview, residentTarget, onResidentTarget, language = 'ru' }) {
  const estates = ['дворяне', 'священники', 'простолюдины'];
  const english = language === 'en';
  return <section className={`city ${active ? 'active' : ''} ${selectedCard ? 'place-target' : ''}`} onClickCapture={(event) => selectedCard && !event.target.closest('.city-head') && onPlace()}>
    <button className="city-head" onClick={onPlace} disabled={!selectedCard}>
      <span>{player.name} ({score(player)} {english ? 'VP' : 'ПО'} <em className="vp-relic">{relicScore(player)}{english ? 'H' : 'Р'}</em> + <em className="vp-resident">{residentScore(player)}{english ? 'R' : 'Ж'}</em> · {player.crusade} ✠)</span>
    </button>
    {infections.filter((infection) => infection.host === player.id).map((infection) => <div className="infection" key={infection.card.uid} onMouseEnter={() => setPlaguePreview(true)} onMouseLeave={() => setPlaguePreview(false)} onClick={() => setPlaguePreview((open) => !open)} title="Нажмите или наведите для просмотра карты эпидемии"><span>☠</span><strong>{infection.card.title}</strong><em>{infection.power} жертв. · {epidemicPriority(infection.card, infection)}</em>{plaguePreview && <div className="plague-preview"><img src={infection.card.art} alt={infection.card.title} /><b>{infection.card.title}</b><small>{infection.card.effect}</small></div>}</div>)}
    <div className="lanes">
      {estates.map((estate) => <div className="lane" key={estate}>
        <label>{estate}</label>
        <div className="residents">{player.city.filter((card) => card.estate === estate).map((card) => card.id === 'guard' ? <div className="guard-stack" key={card.uid}>{player.imprisoned?.length > 0 && <div className="guard-prisoner"><Card faceDown small /></div>}<div className="guard-front"><Card card={card} small targetable={residentTarget?.(card)} selectable={residentTarget?.(card)} selectLabel={english ? 'Select' : 'Выбрать'} onSelect={() => residentTarget?.(card) && onResidentTarget(player.id, card)} /></div></div> : <Card card={card} small key={card.uid} targetable={residentTarget?.(card)} selectable={residentTarget?.(card)} selectLabel={english ? 'Select' : 'Выбрать'} onSelect={() => residentTarget?.(card) && onResidentTarget(player.id, card)} />)}</div>
      </div>)}
    </div>
  </section>;
}

function CityWheel({ players, currentId, wheelPlayer, setWheelPlayer, cityProps, hand = [], crossroads = [], onHandSelect, canSelectHand = false, onCrossroadSelect, canSelectCrossroad }) {
  const shown = players[wheelPlayer] || players[0];
  const moveWheel = (direction) => setWheelPlayer((index) => (index + direction + players.length) % players.length);
  return <section className="wheel-view">
    <div className="wheel-stage" style={{ '--city-bg': `url(${shown.background})` }}>
      <button className="wheel-arrow wheel-arrow-left" onClick={() => moveWheel(-1)} aria-label="Предыдущий город">‹</button>
      <button className="wheel-arrow wheel-arrow-right" onClick={() => moveWheel(1)} aria-label="Следующий город">›</button>
      <div className="wheel-hand"><div className="wheel-section-label">{cityProps.language === 'en' ? 'Your hand' : 'Твоя рука'}</div><div className="wheel-hand-cards">{hand.map((card) => <Card card={card} key={card.uid} selected={cityProps.selectedCard?.uid === card.uid} selectable={canSelectHand} selectLabel={cityProps.language === 'en' ? 'Select' : 'Выбрать'} onSelect={() => onHandSelect?.(card)} />)}</div></div>
      <div className="wheel-ribbon-viewport"><div className="wheel-ribbon" style={{ transform: `translateX(-${wheelPlayer * 100}%)` }}>{players.map((player) => <article className="wheel-ribbon-card" key={player.id}><City {...cityProps} player={player} active={player.id === currentId} onPlace={() => cityProps.onPlace(player.id)} residentTarget={(resident) => cityProps.residentTarget(player.id, resident)} /></article>)}</div></div>
      <div className="wheel-crossroads"><div className="wheel-section-label">{cityProps.language === 'en' ? 'Crossroads' : 'Перекрёсток'}</div><div className="crossroad-cards">{crossroads.map((card, index) => <Card card={card} key={card.uid} targetable={canSelectCrossroad?.(card)} selectable={canSelectCrossroad?.(card)} selectLabel={cityProps.language === 'en' ? 'Select' : 'Выбрать'} onSelect={() => onCrossroadSelect?.(index)} />)}</div></div>
    </div>
    <div className="wheel-caption">{shown.name} · city {wheelPlayer + 1} / {players.length}</div>
  </section>;
}

function PlayDestinationModal({ game, card, language, onOwnCity, onOtherCity, onClose }) {
  const english = language === 'en';
  const [showOthers, setShowOthers] = useState(false);
  const others = game.players.filter((player) => player.id !== game.current);
  const composition = (player) => {
    const counts = player.city.reduce((result, resident) => { result[resident.estate] = (result[resident.estate] || 0) + 1; return result; }, {});
    return `${counts.дворяне || 0} / ${counts.священники || 0} / ${counts.простолюдины || 0}`;
  };
  return createPortal(<div className="destination-modal" role="dialog" aria-label={english ? 'Choose destination' : 'Выбор города'} onClick={onClose}>
    <div className="destination-panel" onClick={(event) => event.stopPropagation()}>
      <h2>{english ? 'Where should this card go?' : 'Куда отправить карту?'}</h2><p className="destination-card-name">«{card.title}»</p>
      <div className="destination-actions"><button onClick={onOwnCity}>{english ? 'Play in your city' : 'Разыграть в своём городе'}</button><button onClick={() => setShowOthers(true)}>{english ? 'Send to another city' : 'Отправить в другой город'}</button></div>
      {showOthers && <div className="opponent-list">{others.map((player) => <button className="opponent-choice" key={player.id} onClick={() => onOtherCity(player.id)}><strong>{player.name}</strong><span>{score(player)} {english ? 'VP' : 'ПО'} · {player.city.length} {english ? 'residents' : 'жит.'}</span><small>{english ? 'Nobles / clergy / commoners' : 'Дворяне / священники / простолюдины'}: {composition(player)}</small></button>)}</div>}
      <button className="destination-cancel" onClick={onClose}>{english ? 'Cancel' : 'Отмена'}</button>
    </div>
  </div>, document.body);
}

function NecromancerModal({ cards, language, onChoose }) {
  const english = language === 'en';
  return createPortal(<div className="destination-modal" role="dialog" aria-label={english ? 'Choose a discarded card' : 'Выбор карты из сброса'}>
    <div className="destination-panel discard-choice-panel">
      <h2>{english ? 'Choose a card to resurrect' : 'Выбери карту для возвращения'}</h2>
      <div className="discard-choice-cards">{cards.map((card) => <Card card={card} key={card.uid} selectable selectLabel={english ? 'Resurrect' : 'Вернуть'} onSelect={() => onChoose(card.uid)} />)}</div>
    </div>
  </div>, document.body);
}

function ScoreChart({ history, players }) {
  const width = 520;
  const height = 230;
  const margin = { top: 12, right: 14, bottom: 34, left: 40 };
  const allScores = history.flatMap((entry) => entry.scores);
  const minScore = Math.min(0, ...allScores);
  const maxScore = Math.max(1, ...allScores);
  const range = Math.max(1, maxScore - minScore);
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (history.length < 2 ? plotWidth / 2 : index / (history.length - 1) * plotWidth);
  const y = (value) => margin.top + (maxScore - value) / range * plotHeight;
  const colors = ['#f5cc75', '#68c9c8', '#e97950', '#bc91e4', '#9ec56b', '#ed94be'];
  const ticks = Array.from({ length: 5 }, (_, index) => minScore + range * index / 4);

  return <div className="score-chart">
    <div className="chart-legend">{players.map((player, index) => <span key={player.id}><i style={{ background: colors[index] }} />{player.name}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Victory points by turn">
      {ticks.map((value) => <g key={value}><line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} /><text x={margin.left - 8} y={y(value) + 4}>{Math.round(value)}</text></g>)}
      <line className="chart-axis" x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} />
      {history.map((_, index) => <text className="chart-turn" key={index} x={x(index)} y={height - 12}>{index}</text>)}
      {players.map((player, playerIndex) => {
        const points = history.map((entry, index) => `${x(index)},${y(entry.scores[playerIndex])}`).join(' ');
        return <g className="chart-series" key={player.id}><polyline points={points} style={{ stroke: colors[playerIndex] }} />{history.map((entry, index) => <circle key={index} cx={x(index)} cy={y(entry.scores[playerIndex])} r="3.5" style={{ fill: colors[playerIndex] }}><title>{`${player.name}, ход ${index}: ${entry.scores[playerIndex]} ПО`}</title></circle>)}</g>;
      })}
      <text className="chart-label" x="12" y={height / 2} transform={`rotate(-90 12 ${height / 2})`}>ПО</text>
      <text className="chart-label" x={width / 2} y={height - 1}>ход</text>
    </svg>
  </div>;
}

export default function App() {
  const [botCount, setBotCount] = useState(3);
  const [language, setLanguage] = useState('ru');
  const [gameSpeed, setGameSpeed] = useState(5);
  const [viewMode, setViewMode] = useState('overview');
  const [wheelPlayer, setWheelPlayer] = useState(0);
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugStatus, setBugStatus] = useState('');
  const [plaguePreview, setPlaguePreview] = useState(false);

  const current = game?.players[game.current];
  useEffect(() => {
    if (!current) return undefined;
    // Let the finished bot's city remain visible briefly so its played cards
    // can be inspected before the ribbon follows the next turn.
    const focusId = game?.pendingChoice?.targetId ?? current.id;
    const timer = setTimeout(() => setWheelPlayer(focusId), game?.current === 0 ? 0 : 1400);
    return () => clearTimeout(timer);
  }, [current?.id, game?.current, game?.pendingChoice?.targetId]);
  const update = (mutate) => setGame((previous) => {
    const next = structuredClone(previous);
    mutate(next);
    return next;
  });
  const say = (text) => setNotice(text);

  async function submitBug() {
    setBugStatus('sending');
    try {
      const response = await fetch('/api/bugreport', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: bugText, version: BUILD_VERSION, project: 'suffering-reborn', history: game?.log?.slice(-30) || [] }) });
      if (!response.ok) throw new Error('Bug report request failed');
      setBugStatus('sent');
    } catch {
      setBugStatus('failed');
    }
  }

  function drawDeck() {
    if (game.phase !== 'draw-deck' || current.bot) return;
    update((next) => {
      const card = next.deck.shift();
      if (!card) return finish(next);
      next.players[next.current].hand.push(card);
      next.phase = 'draw-crossroads';
    });
    say('Теперь выбери одну карту с перекрёстка.');
  }

  function drawCrossroads(index) {
    if (game.phase !== 'draw-crossroads' || current.bot) return;
    update((next) => {
      const card = next.crossroads.splice(index, 1)[0];
      next.players[next.current].hand.push(card);
      refillCrossroads(next);
      next.phase = 'play';
    });
    say('Разыграй обе карты. В свой город или в чужой.');
  }

  function place(targetId) {
    if (!selected || game.phase !== 'play' || current.bot) return;
    if (game.forcedPlay?.playerId === game.current && !game.forcedPlay.cardIds.includes(selected.uid)) {
      say('Сначала разыграй две карты, полученные от Ведьмы.');
      return;
    }
    const needsDiscardForOwnCity = ['lord', 'knight'].includes(selected.id) && targetId === game.current;
    if (needsDiscardForOwnCity && current.hand.filter((card) => card.uid !== selected.uid).length === 0) {
      say(`«${selected.title}» вторым можно поселить только в чужой город.`);
      return;
    }
    update((next) => play(next, next.current, selected, targetId));
    setSelected(null);
    setDestinationOpen(false);
  }

  function selectHandCard(card) {
    if (game.current !== 0 || game.phase !== 'play' || game.pendingChoice) return;
    setSelected(card);
    if (viewMode === 'wheel') setDestinationOpen(true);
  }

  useEffect(() => {
    if (viewMode === 'wheel' && selected && game?.current === 0 && game.phase === 'play') setDestinationOpen(true);
  }, [selected, viewMode, game?.current, game?.phase]);

  function canChooseResident(playerId, resident) {
    const choice = game?.pendingChoice;
    if (!choice || resident.uid === choice.cardUid || resident.id === 'corpse') return false;
    if (!['heretic-alch', 'heretic-science', 'inquisitor', 'recruit', 'hare', 'possesed'].includes(choice.ability)) return false;
    if (choice.ability === 'hare' && choice.residentUid) return false;
    if (playerId !== choice.targetId) return false;
    if (choice.ability === 'recruit') return choice.recruitIds.includes(resident.uid) && resident.crusade <= 0;
    return true;
  }

  function chooseResident(playerId, resident) {
    if (!game?.pendingChoice || !canChooseResident(playerId, resident)) return;
    update((next) => {
      const choice = next.pendingChoice;
      const actor = next.players[choice.actorId];
      const victimCity = next.players[playerId];
      if (!['recruit', 'hare'].includes(choice.ability)) next.pendingChoice = null;
      if (choice.ability === 'heretic-alch') {
        discardResident(next, victimCity, resident, `✦ Еретик-алхимик уничтожает выбранного жителя`);
        actor.crusade += Math.max(0, resident.vp);
        next.log.unshift(`${actor.name} получает ${Math.max(0, resident.vp)} очк. Похода за «${resident.title}».`);
      } else if (choice.ability === 'heretic-science') {
        const destination = adjacentPlayers(next, playerId)[0];
        if (destination) {
          const infected = next.infections.some((infection) => infection.host === playerId);
          moveResident(next, victimCity, destination, resident, `✦ Еретик-натуралист перемещает выбранного жителя в город ${destination.name}.`);
          if (infected) next.infections = next.infections.map((infection) => infection.host === playerId ? { ...infection, host: destination.id } : infection);
        }
      } else if (choice.ability === 'inquisitor') {
        const wasHeretic = resident.id.startsWith('heretic-');
        discardResident(next, victimCity, resident, `✦ Инквизитор ${actor.name} казнит выбранного жителя`);
        if (wasHeretic) { const drawn = next.deck.shift(); if (drawn) actor.hand.push(drawn); next.log.unshift('✦ Инквизитор убивает Еретика и берёт карту.'); }
      } else if (choice.ability === 'recruit') {
        const roundBefore = next.crusadeRound;
        const sent = sendResidentOnCrusade(next, victimCity, resident, Math.max(0, resident.vp));
        next.log.unshift(`${actor.name} отправляет «${resident.title}» в Поход за ${sent} очк.`);
        choice.recruitIds = choice.recruitIds.filter((uid) => uid !== resident.uid);
        if (!choice.recruitIds.length || next.crusadeRound !== roundBefore) next.pendingChoice = null;
      } else if (choice.ability === 'hare') {
        choice.residentUid = resident.uid;
        next.log.unshift(`${actor.name} выбирает «${resident.title}». Теперь выбери карту на Перекрёстке для обмена.`);
      } else if (choice.ability === 'possesed') {
        next.log.unshift(`✦ Одержимый повторяет способность выбранного жителя «${resident.title}».`);
        resolveEntryAbility(next, choice.actorId, choice.targetId, resident);
      }
      next.phase = next.pendingChoice ? 'choice' : 'play';
      if (!next.pendingChoice && !next.forcedPlay && !actor.hand.length && next.current === actor.id) endTurn(next);
    });
    setNotice('Выбор применён.');
  }

  function chooseNecromancer(cardUid) {
    const choice = game?.pendingChoice;
    if (!choice || choice.ability !== 'heretic-necro' || !choice.cardIds.includes(cardUid)) return;
    update((next) => {
      const currentChoice = next.pendingChoice;
      const actor = next.players[currentChoice.actorId];
      const target = next.players[currentChoice.targetId];
      const resurrected = next.discard.find((card) => card.uid === cardUid);
      const sacrifice = actor.hand.find((card) => card.uid !== currentChoice.cardUid);
      if (!resurrected || !sacrifice) return;
      actor.hand = actor.hand.filter((card) => card.uid !== sacrifice.uid);
      next.discard.push(sacrifice);
      next.discard = next.discard.filter((card) => card.uid !== resurrected.uid);
      target.city.push(resurrected);
      next.pendingChoice = null;
      next.phase = 'play';
      next.log.unshift(`✦ ${actor.name} жертвует «${sacrifice.title}» и возвращает «${resurrected.title}» из сброса.`);
      if (!next.forcedPlay && !actor.hand.length && next.current === actor.id) endTurn(next);
    });
    setNotice('Некромант вернул выбранную карту.');
  }

  function skipRecruiter() {
    if (game?.pendingChoice?.ability !== 'recruit') return;
    update((next) => {
      const actor = next.players[next.pendingChoice.actorId];
      next.pendingChoice = null;
      next.phase = 'play';
      next.log.unshift(`${actor.name} решает не отправлять больше жителей в Поход.`);
      if (!next.forcedPlay && !actor.hand.length && next.current === actor.id) endTurn(next);
    });
    setNotice('Рекрутёр пропускает способность.');
  }

  function canChooseCrossroad(card) {
    const choice = game?.pendingChoice;
    return ['jester', 'crossbowman'].includes(choice?.ability) && !card.epidemic
      || choice?.ability === 'hare' && Boolean(choice.residentUid) && !card.epidemic;
  }

  function chooseCrossroad(index) {
    if (!game?.pendingChoice || !canChooseCrossroad(game.crossroads[index])) return;
    update((next) => {
      const choice = next.pendingChoice;
      const copied = next.crossroads[index];
      const actor = next.players[choice.actorId];
      next.pendingChoice = null;
      next.phase = 'play';
      if (copied.id === 'jester') next.log.unshift(`✦ ${actor.name} выбирает Шута, но его способность не зацикливается.`);
      else {
        next.log.unshift(`✦ Шут копирует мгновенное свойство «${copied.title}».`);
        resolveEntryAbility(next, choice.actorId, choice.targetId, copied);
      }
      if (!next.pendingChoice && !next.forcedPlay && !actor.hand.length && next.current === actor.id) endTurn(next);
    });
    setNotice('Способность карты с Перекрёстка применена.');
  }

  function chooseCrossbowmanCrossroad(index) {
    if (!game?.pendingChoice || game.pendingChoice.ability !== 'crossbowman' || !canChooseCrossroad(game.crossroads[index])) return;
    update((next) => {
      const choice = next.pendingChoice;
      const actor = next.players[choice.actorId];
      const victim = next.crossroads[index];
      next.crossroads.splice(index, 1);
      next.discard.push(victim);
      refillCrossroads(next);
      next.pendingChoice = null;
      next.phase = 'play';
      next.log.unshift(`✦ ${actor.name} выбирает «${victim.title}» на Перекрёстке для сброса.`);
      if (!next.pendingChoice && !next.forcedPlay && !actor.hand.length && next.current === actor.id) endTurn(next);
    });
    setNotice('Арбалетчик сбросил выбранную карту.');
  }

  function chooseHareCrossroad(index) {
    if (!game?.pendingChoice || game.pendingChoice.ability !== 'hare' || !game.pendingChoice.residentUid || !canChooseCrossroad(game.crossroads[index])) return;
    update((next) => {
      const choice = next.pendingChoice;
      const actor = next.players[choice.actorId];
      const victimCity = next.players[choice.targetId];
      const resident = victimCity.city.find((item) => item.uid === choice.residentUid);
      const replacement = next.crossroads[index];
      if (!resident || !replacement) return;
      victimCity.city = victimCity.city.filter((item) => item.uid !== resident.uid);
      next.crossroads[index] = resident;
      victimCity.city.push(replacement);
      next.pendingChoice = null;
      next.phase = 'play';
      next.log.unshift(`${actor.name} меняет «${resident.title}» на «${replacement.title}» с Перекрёстка.`);
      if (!next.pendingChoice && !next.forcedPlay && !actor.hand.length && next.current === actor.id) endTurn(next);
    });
    setNotice('Заяц обменял выбранных персонажей.');
  }

  function finish(next) {
    recordHistory(next, 'конец');
    next.ended = true;
    next.phase = 'ended';
    next.log.unshift('Колода иссякла. Пора считать тех, кто ещё дышит.');
  }

  function refillCrossroads(next) {
    while (next.crossroads.length < 3 && next.deck.length) next.crossroads.push(next.deck.shift());
  }

  function resolveEpidemic(next, infection) {
    if (!infection || infection.host !== next.current) return;
    const city = next.players[infection.host];
    const protectedIds = new Set(['leper', 'cat', 'corpse']);
    const candidates = city.city.filter((card) => !protectedIds.has(card.id));
    const priorityEstate = { cholera: 'простолюдины', leprosy: 'священники', malaria: 'дворяне' }[infection.card.id];
    candidates.sort((a, b) => (priorityEstate && a.estate === priorityEstate ? -1 : 0) - (priorityEstate && b.estate === priorityEstate ? -1 : 0) || (infection.card.id === 'black_pox' ? b.immunity - a.immunity : a.immunity - b.immunity));
    let victims = candidates.slice(0, infection.power);
    // Peasants die as a group: once any peasant is selected by any epidemic,
    // every non-protected peasant in that city becomes a victim immediately.
    if (victims.some((victim) => victim.id === 'peasant')) {
      victims = city.city.filter((resident) => resident.id === 'peasant' && !protectedIds.has(resident.id));
    }
    if (city.city.some((resident) => resident.id === 'cat') && victims.length) {
      const cat = city.city.find((resident) => resident.id === 'cat');
      city.city = city.city.filter((resident) => resident.uid !== cat.uid);
      next.discard.push(cat);
      victims = victims.slice(0, Math.max(0, victims.length - 1));
    }
    victims.forEach((victim) => {
      city.city.splice(city.city.findIndex((card) => card.uid === victim.uid), 1);
      next.discard.push(victim);
    });
    if (!city.city.length || !victims.length) {
      next.log.unshift(`${infection.card.title} погасла в городе ${city.name}.`);
      next.discard.push(infection.card);
      next.infections = next.infections.filter((item) => item.card.uid !== infection.card.uid);
      return;
    }
    next.log.unshift(`${infection.card.title}: ${victims.map((card) => card.title).join(', ')} покидают город ${city.name}.`);
    next.infections = next.infections.map((item) => item.card.uid === infection.card.uid
      ? { ...item, host: (item.host + 1) % next.players.length, power: item.host === item.origin ? item.power + 1 : item.power }
      : item);
  }

  function resolveEpidemics(next) {
    next.infections.filter((infection) => infection.host === next.current).forEach((infection) => resolveEpidemic(next, infection));
  }

  function endTurn(next) {
    resolveEpidemics(next);
    if (next.players.some((player) => residentCount(player) >= 10)) {
      recordHistory(next, 'конец');
      next.ended = true;
      next.phase = 'ended';
      next.log.unshift('Город разросся до десяти жителей. История заканчивается.');
      return;
    }
    recordHistory(next, `ход ${next.history.length}`);
    next.current = (next.current + 1) % next.players.length;
    next.phase = 'draw-deck';
  }

  function triggerCrusade(next, ownerId, local = false) {
    let sent = 0;
    const departures = next.players.filter((player) => !local || player.id === ownerId).map((player) => {
      const cityHasWomanOrAdaptable = player.city.some((card) => WOMEN.has(card.id) || card.id === 'adaptable');
      let pilgrims = player.city.filter((card) => card.crusade !== 0 && !(card.id === 'templar' && cityHasWomanOrAdaptable));
      // Standard Bearers have no personal crusade points, but join whenever
      // at least one other crusader leaves so their group bonus can apply.
      pilgrims = [...pilgrims, ...player.city.filter((card) => card.id === 'standard_bearer' && !pilgrims.includes(card))];
      const knight = player.city.find((card) => card.id === 'knight');
      const squire = player.city.find((card) => card.id === 'weapon_bearer');
      const otherPilgrims = pilgrims.filter((card) => !['knight', 'weapon_bearer'].includes(card.id));
      if (knight && squire && !otherPilgrims.length) pilgrims = [squire];
      return { player, pilgrims };
    });
    departures.forEach(({ player, pilgrims }) => {
      if (!pilgrims.length) return;
      const standardBearers = pilgrims.filter((card) => card.id === 'standard_bearer');
      const points = pilgrims.every((card) => card.id === 'warhorse') ? 0 : pilgrims.reduce((total, card) => total + card.crusade, 0) + standardBearers.length * Math.max(0, pilgrims.length - 1);
      player.city = player.city.filter((card) => !pilgrims.includes(card));
      if (pilgrims.some((card) => card.id === 'guard') && player.imprisoned?.length) {
        player.hand.push(...player.imprisoned);
        player.imprisoned = [];
        next.log.unshift(`${player.name} освобождает карты, спрятанные Стражником.`);
      }
      pilgrims.forEach((card) => {
        if (card.id === 'deserter') {
          const destination = next.players[(player.id + 1) % next.players.length];
          destination.city.push(card);
          next.log.unshift(`✦ Дезертир вместо сброса появляется в городе ${destination.name}.`);
        } else if (card.id === 'virgin') {
          const replacementIndex = next.deck.findIndex((candidate) => !candidate.epidemic && !WOMEN.has(candidate.id));
          if (replacementIndex >= 0) {
            const replacement = next.deck.splice(replacementIndex, 1)[0];
            player.city.push(replacement);
            next.log.unshift(`✦ Девственник заменяется мужчиной «${replacement.title}» из колоды.`);
          } else next.discard.push(card);
        } else next.discard.push(card);
      });
      if (next.crusadeRound <= 3) {
        player.crusade += points;
        sent += points;
      }
    });
    if (next.crusadeRound <= 3) next.crusadePool = Math.max(0, next.crusadePool - sent);
    next.log.unshift(`${next.players[ownerId].name} созывает ${local ? 'местный' : 'общий'} Крестовый поход: Святая Земля теряет ${sent} очк.`);
    resolveCrusadeRound(next);
  }

  function resolveCrusadeRound(next) {
    if (next.crusadeRound > 3 || next.crusadePool > 0) return false;
    const winner = [...next.players].sort((a, b) => b.crusade - a.crusade || a.relics.length - b.relics.length || b.city.filter((card) => card.estate === 'священники').length - a.city.filter((card) => card.estate === 'священники').length || score(a) - score(b))[0];
    winner.relics.push(next.relicDeck.shift() || RELIC_CARDS[(next.crusadeRound - 1) % RELIC_CARDS.length]);
    next.log.unshift(`${winner.name} получает Реликвию: +${RELIC_VP} ПО в конце игры.`);
    next.players.forEach((player) => { player.crusade = 0; });
    next.crusadeRound += 1;
    next.crusadePool = next.crusadeRound <= 3 ? next.crusadeLimit : 0;
    return true;
  }

  function discardResident(next, player, resident, reason) {
    player.city = player.city.filter((item) => item.uid !== resident.uid);
    if (resident.id === 'guard' && player.imprisoned?.length) {
      revealGuardCard(next, player);
    }
    next.discard.push(resident);
    next.log.unshift(`${reason}: «${resident.title}» отправляется в сброс.`);
  }

  function revealGuardCard(next, player) {
    const hidden = player.imprisoned?.shift();
    if (!hidden) return;
    next.log.unshift(`✦ Стражник сброшен: карта «${hidden.title}» раскрывается и срабатывает.`);
    if (hidden.epidemic) {
      const syphilisBoost = hidden.id === 'syphilis' && player.city.some((resident) => ['harlot', 'devka'].includes(resident.id));
      next.infections.push({ card: hidden, host: player.id, origin: player.id, power: syphilisBoost ? 2 : hidden.victims, syphilisBoosted: syphilisBoost });
      if (syphilisBoost) next.log.unshift('✦ Раскрытая Сифилис начинает с двух жертв.');
    } else {
      player.city.push(hidden);
      resolveEntryAbility(next, player.id, player.id, hidden);
    }
  }

  function strongestResident(player, exceptUid) {
    return player.city.filter((resident) => resident.uid !== exceptUid && resident.id !== 'corpse').sort((a, b) => b.vp - a.vp || b.immunity - a.immunity)[0];
  }

  function adjacentPlayers(next, playerId) {
    return [next.players[(playerId + next.players.length - 1) % next.players.length], next.players[(playerId + 1) % next.players.length]]
      .filter((player, index, players) => player.id !== playerId && players.findIndex((item) => item.id === player.id) === index);
  }

  function advanceAdaptable(resident) {
    if (resident?.id !== 'adaptable') return;
    const estates = ['простолюдины', 'священники', 'дворяне'];
    resident.vp += 1;
    resident.estate = estates[Math.min(estates.indexOf(resident.estate) + 1, estates.length - 1)];
  }

  function moveResident(next, from, to, resident, message) {
    if (!resident) return false;
    from.city = from.city.filter((item) => item.uid !== resident.uid);
    const midget = resident.id !== 'midget' && from.city.find((item) => item.id === 'midget');
    if (midget) from.city = from.city.filter((item) => item.uid !== midget.uid);
    advanceAdaptable(resident);
    to.city.push(resident);
    if (midget) to.city.push(midget);
    if (message) next.log.unshift(message);
    return true;
  }

  function sendResidentOnCrusade(next, player, resident, points = resident.crusade || Math.max(0, resident.vp)) {
    if (!resident) return 0;
    player.city = player.city.filter((item) => item.uid !== resident.uid);
    next.discard.push(resident);
    // The resident's full value counts toward the final score, even when it
    // crosses the remaining Holy Land threshold. Only the shared pool floors
    // at zero; otherwise the threshold-crossing player would be unfairly
    // reduced to the last single point.
    const sent = Math.max(0, points);
    player.crusade += sent;
    if (next.crusadeRound <= 3) next.crusadePool = Math.max(0, next.crusadePool - sent);
    resolveCrusadeRound(next);
    return sent;
  }

  // Effects that do not need a human choice resolve immediately, and every one
  // writes a Chronicle entry so it is obvious that the card actually fired.
  function resolveEntryAbility(next, ownerId, targetId, card) {
    const target = next.players[targetId];
    const owner = next.players[ownerId];
    const activate = (text) => next.log.unshift(`✦ ${card.title}: ${text}`);
    const mutilator = target.city.find((resident) => resident.id === 'mutilator' && resident.uid !== card.uid);
    if (card.id === 'witch') {
      const drawn = next.deck.splice(0, 2);
      drawn.forEach((drawnCard) => target.hand.push(drawnCard));
      const resumeCurrent = next.current === targetId ? null : next.current;
      next.forcedPlay = drawn.length ? { playerId: targetId, cardIds: drawn.map((drawnCard) => drawnCard.uid), resumeCurrent } : null;
      if (drawn.length && resumeCurrent !== null) {
        next.current = targetId;
        next.phase = 'play';
      }
      activate(`${target.name} получает ${drawn.length} карты из колоды и должен разыграть их немедленно.`);
    }
    if (card.id === 'lady') {
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((resident) => resident.id === 'knight'));
      const knight = adjacent?.city.find((resident) => resident.id === 'knight');
      if (knight) activate(`отправляет Рыцаря из города ${adjacent.name} в Поход за ${sendResidentOnCrusade(next, adjacent, knight)} очк.`);
    } else if (card.id === 'driver') {
      const resident = target.city.find((item) => item.uid !== card.uid && item.estate === 'простолюдины');
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((item) => item.estate === resident?.estate));
      const replacement = adjacent?.city.find((item) => item.estate === resident?.estate);
      if (resident && replacement) {
        target.city = target.city.filter((item) => item.uid !== resident.uid); adjacent.city = adjacent.city.filter((item) => item.uid !== replacement.uid);
        advanceAdaptable(resident);
        advanceAdaptable(replacement);
        target.city.push(replacement); adjacent.city.push(resident); activate(`меняет жителей сословия «${resident.estate}» с городом ${adjacent.name}.`);
      }
    } else if (card.id === 'minstrel') {
      const adjacent = next.players.filter((player) => player.id !== targetId).sort((a, b) => b.crusade - a.crusade)[0];
      const stolen = Math.min(3, adjacent?.crusade || 0);
      if (adjacent && stolen) { adjacent.crusade -= stolen; target.crusade += stolen; activate(`крадёт ${stolen} очк. Похода у города ${adjacent.name}.`); }
    } else if (card.id === 'troubadur') {
      const stolen = next.players.filter((player) => player.id !== targetId).reduce((total, player) => { const amount = Math.min(1, player.crusade); player.crusade -= amount; return total + amount; }, 0);
      target.crusade += stolen; activate(`крадёт по 1 очку Похода у соседних городов (${stolen} всего).`);
    } else if (card.id === 'harlot') {
      const victim = target.city.find((resident) => resident.uid !== card.uid && WOMEN.has(resident.id));
      if (victim) discardResident(next, target, victim, '✦ Распутная девка сбрасывает женщину');
      else activate('не находит женщину в городе.');
    } else if (card.id === 'devka') {
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((resident) => resident.id === 'monk'));
      const monk = adjacent?.city.find((resident) => resident.id === 'monk');
      if (monk) moveResident(next, adjacent, target, monk, `✦ ${card.title} переманивает Монаха из города ${adjacent.name}.`);
    } else if (card.id === 'fanatic') {
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((resident) => resident.estate === 'простолюдины' && resident.crusade > 0));
      const resident = adjacent?.city.find((item) => item.estate === 'простолюдины' && item.crusade > 0);
      if (resident) moveResident(next, adjacent, target, resident, `✦ Фанатик переманивает крестоносца из города ${adjacent.name}.`);
    } else if (card.id === 'kolya') {
      adjacentPlayers(next, targetId).forEach((adjacent) => {
        const woman = adjacent.city.find((resident) => WOMEN.has(resident.id));
        if (woman) moveResident(next, adjacent, target, woman, `✦ Коля переманивает «${woman.title}» из города ${adjacent.name}.`);
      });
    } else if (card.id === 'recruit') {
      const recruits = target.city.filter((resident) => resident.uid !== card.uid && resident.crusade <= 0 && resident.id !== 'corpse');
      if (owner.bot) {
        const roundBefore = next.crusadeRound;
        let sent = 0;
        for (const resident of recruits.slice(0, 2)) {
          sent += sendResidentOnCrusade(next, target, resident, Math.max(0, resident.vp));
          if (next.crusadeRound !== roundBefore) break;
        }
        if (sent) activate(`отправляет мирных жителей в Поход за ${sent} очк.`);
        if (next.crusadeRound !== roundBefore) activate('Святая Земля достигла лимита — распределена Реликвия.');
      } else if (recruits.length) {
        next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid, recruitIds: recruits.slice(0, 2).map((resident) => resident.uid) };
        next.phase = 'choice';
        activate('выбери до двух мирных жителей для Похода или остановись в любой момент.');
      }
    } else if (card.id === 'jester') {
      const crossroadsCard = next.crossroads.find((item) => !item.epidemic);
      if (crossroadsCard) {
        if (owner.bot) { activate(`копирует мгновенное свойство «${crossroadsCard.title}».`); resolveEntryAbility(next, ownerId, targetId, crossroadsCard); }
        else { next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid }; next.phase = 'choice'; activate('выбери карту на Перекрёстке для копирования.'); }
      }
    } else if (card.id === 'possesed') {
      const localCard = target.city.find((resident) => resident.uid !== card.uid && resident.id !== 'possesed');
      if (localCard) {
        if (owner.bot) { activate(`повторяет мгновенное свойство «${localCard.title}».`); resolveEntryAbility(next, ownerId, targetId, localCard); }
        else { next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid }; next.phase = 'choice'; activate('выбери жителя, чью способность повторить.'); }
      }
    } else if (card.id === 'innkeeper') {
      const drawn = next.deck.shift();
      if (drawn) { target.city.push(drawn); activate(`кладёт «${drawn.title}» в город без мгновенного свойства.`); }
    } else if (card.id === 'guard') {
      const imprisoned = next.deck.shift();
      if (imprisoned) { target.imprisoned = [...(target.imprisoned || []), imprisoned]; activate(`прячет верхнюю карту колоды под Стражником.`); }
    } else if (card.id === 'cupbearer') {
      const noble = target.city.find((resident) => resident.estate === 'дворяне' && resident.uid !== card.uid);
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((resident) => resident.estate === 'простолюдины'));
      const commoner = adjacent?.city.find((resident) => resident.estate === 'простолюдины');
      if (noble && commoner) { target.city = target.city.filter((item) => item.uid !== noble.uid); adjacent.city = adjacent.city.filter((item) => item.uid !== commoner.uid); target.city.push(commoner); adjacent.city.push(noble); activate(`меняет дворянина на простолюдина из города ${adjacent.name}.`); }
    } else if (card.id === 'hare') {
      const resident = target.city.find((item) => item.uid !== card.uid);
      const replacement = next.crossroads[0];
      if (resident && replacement) {
        if (owner.bot && target.bot) {
          target.city = target.city.filter((item) => item.uid !== resident.uid); next.crossroads[0] = resident; target.city.push(replacement); activate(`меняет «${resident.title}» на «${replacement.title}» с Перекрёстка.`);
        } else {
          next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid };
          next.phase = 'choice';
          activate('выбери жителя для обмена с первой картой Перекрёстка.');
        }
      }
    } else if (card.id === 'heretic-science') {
      const resident = strongestResident(target, card.uid);
      const destination = adjacentPlayers(next, targetId)[0];
      if (resident && destination) {
        if (owner.bot) { const epidemic = next.infections.some((infection) => infection.host === targetId); moveResident(next, target, destination, resident, `✦ Еретик-натуралист перемещает «${resident.title}» в город ${destination.name}.`); if (epidemic) next.infections = next.infections.map((infection) => infection.host === targetId ? { ...infection, host: destination.id } : infection); }
        else { next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid }; next.phase = 'choice'; activate('выбери жителя для перемещения.'); }
      }
    } else if (card.id === 'heretic-alch') {
      const resident = strongestResident(target, card.uid);
      if (resident) {
        if (owner.bot) { discardResident(next, target, resident, '✦ Еретик-алхимик уничтожает жителя'); target.crusade += Math.max(0, resident.vp); }
        else { next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid }; next.phase = 'choice'; activate('выбери жителя для уничтожения.'); }
      }
    } else if (card.id === 'heretic-necro') {
      const sacrifice = owner.hand.find((item) => item.uid !== card.uid);
      const resurrectable = next.discard.slice(-5).filter((item) => !item.epidemic);
      if (sacrifice && resurrectable.length) {
        if (owner.bot) {
          const resurrected = resurrectable[resurrectable.length - 1];
          owner.hand = owner.hand.filter((item) => item.uid !== sacrifice.uid);
          next.discard.push(sacrifice);
          next.discard = next.discard.filter((item) => item.uid !== resurrected.uid);
          target.city.push(resurrected);
          activate(`сбрасывает карту и возвращает «${resurrected.title}» из сброса.`);
        } else {
          next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid, cardIds: resurrectable.map((item) => item.uid) };
          next.phase = 'choice';
          activate('выбери карту из последних пяти карт сброса для возвращения.');
        }
      }
    }
    if (WOMEN.has(card.id) && mutilator) {
      const destination = Array.from({ length: next.players.length - 1 }, (_, step) => next.players[(targetId + step + 1) % next.players.length])
        .find((player) => !player.city.some((resident) => WOMEN.has(resident.id)));
      if (destination) {
        target.city = target.city.filter((resident) => resident.uid !== mutilator.uid);
        destination.city.push(mutilator);
        activate(`появляется женщина — Увещеватель уходит в город ${destination.name}.`);
      } else discardResident(next, target, mutilator, '✦ Увещеватель не находит город без женщины');
    }
    if (card.id === 'plague_doc') {
      const infection = next.infections.find((item) => item.host === targetId);
      if (infection) {
        next.discard.push(infection.card); next.infections = next.infections.filter((item) => item.card.uid !== infection.card.uid);
        activate(`лечит эпидемию в городе ${target.name}.`);
      } else activate(`в городе ${target.name} нет эпидемии — лечение не требуется.`);
    } else if (card.id === 'inquisitor') {
      const botBurden = owner.bot && owner.city.filter((resident) => resident.uid !== card.uid && resident.vp < 0).sort((a, b) => a.vp - b.vp)[0];
      const victim = botBurden ?? strongestResident(target, card.uid);
      const victimCity = botBurden ? owner : target;
      const anyVictim = owner.city.some((resident) => resident.uid !== card.uid && resident.id !== 'corpse');
      if (owner.bot && victim) {
          const wasHeretic = victim.id.startsWith('heretic-');
          discardResident(next, victimCity, victim, `✦ Инквизитор ${owner.name} казнит жителя`);
          if (wasHeretic) { const drawn = next.deck.shift(); if (drawn) owner.hand.push(drawn); activate('убивает Еретика и берёт карту.'); }
      } else if (!owner.bot && anyVictim) { next.pendingChoice = { ability: card.id, actorId: ownerId, targetId: ownerId, cardUid: card.uid }; next.phase = 'choice'; activate('выбери жителя в своём городе для казни.'); }
      else activate('не находит жертву.');
    } else if (card.id === 'episcop') {
      activate('созывает общий Крестовый поход.'); triggerCrusade(next, targetId);
    } else if (card.id === 'preacher') {
      activate('созывает местный Крестовый поход.'); triggerCrusade(next, targetId, true);
    } else if (card.id === 'baby') {
      const victim = target.city.find((resident) => resident.uid !== card.uid && ['lady', 'harlot', 'devka'].includes(resident.id));
      if (victim) discardResident(next, target, victim, '✦ Младенец изгоняет женщину');
      else activate('не находит Леди или Девки в городе.');
    } else if (card.id === 'crossbowman') {
      const eligible = next.crossroads.filter((item) => !item.epidemic);
      if (!eligible.length) activate('не находит персонажей на Перекрёстке.');
      else if (owner.bot) {
        const victim = [...eligible].sort((a, b) => b.vp - a.vp)[0];
        next.crossroads = next.crossroads.filter((item) => item.uid !== victim.uid);
        next.discard.push(victim);
        refillCrossroads(next);
        activate(`сбрасывает «${victim.title}» с Перекрёстка.`);
      } else {
        next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid };
        next.phase = 'choice';
        activate('выбери карту на Перекрёстке для сброса.');
      }
    } else if (card.id === 'bandit') {
      const enemy = next.players.filter((player) => player.id !== targetId).sort((a, b) => score(b) - score(a))[0];
      const victim = enemy?.city.filter((resident) => resident.estate === 'дворяне').sort((a, b) => b.vp - a.vp)[0];
      if (victim) discardResident(next, enemy, victim, `✦ Разбойник убивает дворянина в городе ${enemy.name}`);
      else activate('не находит дворянина в другом городе.');
    } else if (card.id === 'executioner') {
      const victim = target.city.filter((resident) => resident.uid !== card.uid && resident.estate === 'дворяне').sort((a, b) => b.vp - a.vp)[0];
      if (victim) discardResident(next, target, victim, '✦ Палач казнит дворянина');
      else activate('не находит дворянина в этом городе.');
      adjacentPlayers(next, targetId).forEach((adjacent) => {
        const commoner = adjacent.city.find((resident) => resident.estate === 'простолюдины');
        if (commoner) moveResident(next, adjacent, target, commoner, `✦ Палач переманивает «${commoner.title}» из города ${adjacent.name}.`);
      });
    } else if (card.id === 'priest') {
      const drawn = next.deck.shift();
      if (!drawn) activate('колода пуста.');
      else if (drawn.crusade > 0) {
        next.discard.push(drawn);
        target.crusade += drawn.crusade;
        if (next.crusadeRound <= 3) next.crusadePool = Math.max(0, next.crusadePool - drawn.crusade);
        activate(`отправляет «${drawn.title}» в Поход за ${drawn.crusade} очк.`);
      } else { next.discard.push(drawn); activate(`берёт «${drawn.title}» без очков Похода и сбрасывает.`); }
    }
  }

  function play(next, ownerId, card, targetId) {
    const owner = next.players[ownerId];
    const target = next.players[targetId];
    if (next.forcedPlay?.playerId === ownerId && !next.forcedPlay.cardIds.includes(card.uid)) return;
    const forcedResumeCurrent = next.forcedPlay?.playerId === ownerId ? next.forcedPlay.resumeCurrent : null;
    const handIndex = owner.hand.findIndex((item) => item.uid === card.uid);
    if (handIndex < 0) return;
    const needsDiscardForOwnCity = ['lord', 'knight'].includes(card.id) && targetId === ownerId;
    const discardCost = needsDiscardForOwnCity && owner.hand.find((item) => item.uid !== card.uid);
    if (needsDiscardForOwnCity && !discardCost) return;
    owner.hand.splice(handIndex, 1);
    if (discardCost) {
      owner.hand = owner.hand.filter((item) => item.uid !== discardCost.uid);
      next.discard.push(discardCost);
      next.log.unshift(`${owner.name} сбрасывает «${discardCost.title}», чтобы поселить «${card.title}» в своём городе.`);
    }
    if (card.epidemic) {
      const syphilisBoost = card.id === 'syphilis' && target.city.some((resident) => ['harlot', 'devka'].includes(resident.id));
      next.infections.push({ card, host: targetId, origin: targetId, power: syphilisBoost ? 2 : card.victims, syphilisBoosted: syphilisBoost });
      next.log.unshift(`${owner.name} приносит «${card.title}» в город ${target.name}.`);
      if (syphilisBoost) next.log.unshift('✦ Сифилис начинает с двух жертв: в исходном городе есть Девка или Распутная девка.');
    } else {
      target.city.push(card);
      next.log.unshift(`${owner.name} селит «${card.title}» в городе ${target.name}.`);
      resolveEntryAbility(next, ownerId, targetId, card);
    }
    if (next.forcedPlay?.playerId === ownerId) {
      next.forcedPlay.cardIds = next.forcedPlay.cardIds.filter((cardId) => cardId !== card.uid);
      if (!next.forcedPlay.cardIds.length) {
        next.forcedPlay = null;
        if (forcedResumeCurrent !== null) {
          next.current = forcedResumeCurrent;
          next.phase = 'play';
        }
      }
    }
    if (!next.forcedPlay && !next.pendingChoice && !owner.hand.length && next.current === ownerId) endTurn(next);
  }

  function episcopWouldAwardRelicToOther(next, botId) {
    const simulation = structuredClone(next);
    const before = simulation.players.map((player) => player.relics.length);
    triggerCrusade(simulation, botId);
    return simulation.players.some((player, index) => player.id !== botId && player.relics.length > before[index]);
  }

  useEffect(() => {
    if (!game || !current?.bot || game.ended) return undefined;
    const timer = setTimeout(() => update((next) => {
      const bot = next.players[next.current];
      if (next.phase === 'draw-deck') {
        const card = next.deck.shift(); if (!card) return finish(next);
        bot.hand.push(card); next.phase = 'draw-crossroads';
      } else if (next.phase === 'draw-crossroads') {
        const avoidEpiscop = episcopWouldAwardRelicToOther(next, bot.id);
        const choices = avoidEpiscop ? next.crossroads.map((card, index) => card.id === 'episcop' ? -1 : index).filter((index) => index >= 0) : next.crossroads.map((_, index) => index);
        const availableChoices = choices.length ? choices : next.crossroads.map((_, index) => index);
        const index = availableChoices[Math.floor(Math.random() * availableChoices.length)];
        const card = next.crossroads.splice(index, 1)[0]; bot.hand.push(card);
        refillCrossroads(next);
        next.phase = 'play';
      } else if (next.phase === 'play') {
        if (next.forcedPlay && next.forcedPlay.playerId !== bot.id) return;
        const forcedCard = next.forcedPlay?.playerId === bot.id && bot.hand.find((item) => next.forcedPlay.cardIds.includes(item.uid));
        const avoidEpiscop = episcopWouldAwardRelicToOther(next, bot.id);
        const powerfulSelfCard = bot.hand.find((item) => ['lord', 'knight'].includes(item.id) && bot.hand.some((other) => other.uid !== item.uid));
        const safeCard = avoidEpiscop ? bot.hand.find((item) => item.id !== 'episcop') : bot.hand[0];
        const scoringCard = bot.hand.find((item) => item.id !== 'episcop' && !item.epidemic && item.vp >= 0);
        const card = forcedCard || powerfulSelfCard || scoringCard || safeCard || bot.hand[0];
        const highestScoringOpponent = [...next.players].filter((player) => player.id !== bot.id).sort((a, b) => score(b) - score(a))[0];
        const victoryLeader = [...next.players].sort((a, b) => score(b) - score(a))[0];
        const targetLeader = victoryLeader.id === bot.id ? highestScoringOpponent : victoryLeader;
        const leaderWithoutPlague = [...next.players].filter((player) => player.id !== bot.id && !next.infections.some((infection) => infection.host === player.id)).sort((a, b) => score(b) - score(a))[0];
        const isSecondSelfPlay = ['lord', 'knight'].includes(card.id) && bot.hand.filter((item) => item.uid !== card.uid).length === 0;
        const attackLeader = next.history.length > 4 && targetLeader && residentCount(targetLeader) >= 5;
        const targetId = card.id === 'plague_doc'
          ? (bot.city.some((resident) => resident.id === 'devil') ? bot.id : (leaderWithoutPlague?.id ?? targetLeader.id))
          : isSecondSelfPlay ? targetLeader.id : card.epidemic ? (leaderWithoutPlague?.id ?? targetLeader.id) : (card.vp < 0 && attackLeader ? targetLeader.id : bot.id);
        play(next, bot.id, card, targetId);
      }
    }), game.gameSpeed === 10 ? 5000 : 2000);
    return () => clearTimeout(timer);
  }, [game, current?.bot, current?.id]);

  useEffect(() => {
    if (!game || current?.bot || game.ended || game.phase !== 'draw-deck') return undefined;
    const timer = setTimeout(() => {
      update((next) => {
        const card = next.deck.shift();
        if (!card) return finish(next);
        next.players[next.current].hand.push(card);
        next.phase = 'draw-crossroads';
      });
      setNotice('Карта из колоды взята. Теперь выбери карту с Перекрёстка.');
    }, 250);
    return () => clearTimeout(timer);
  }, [game, current?.bot, current?.id, game?.phase]);

  if (!game) {
    const english = language === 'en';
    return <main className="welcome"><div className="lobby-meta"><div className="option-group"><span>{english ? 'Language' : 'Язык'}</span><div className="segmented"><button className={language === 'ru' ? 'picked' : ''} onClick={() => setLanguage('ru')}>RU</button><button className={language === 'en' ? 'picked' : ''} onClick={() => setLanguage('en')}>EN</button></div></div><small className="build-version">#{BUILD_VERSION}</small></div><div className="welcome-card"><p className="eyebrow">{english ? 'A tabletop game, rebuilt from the ashes' : 'Настольная игра, восставшая из пепла'}</p><p className="lede">{english ? 'Medieval city-building, if human life cost roughly half a card.' : 'Средневековое градостроительство, если человеческая жизнь стоила примерно пол-карты.'}</p><div className="bot-picker"><span>{english ? 'Opponents' : 'Соперники'}</span>{[1, 2, 3, 4, 5].map((count) => <button key={count} className={botCount === count ? 'picked' : ''} onClick={() => setBotCount(count)}>{count}</button>)}</div><div className="lobby-speed option-group"><span>{english ? 'Game speed' : 'Скорость игры'}</span><div className="segmented"><button className={gameSpeed === 5 ? 'picked' : ''} onClick={() => setGameSpeed(5)}>5s</button><button className={gameSpeed === 10 ? 'picked' : ''} onClick={() => setGameSpeed(10)}>10s</button></div></div><button className="start" onClick={() => setGame(freshGame(botCount, language, gameSpeed))}>{english ? 'Found a city' : 'Основать город'} <span>→</span></button><p className="rules">{english ? 'Each turn: deck → crossroads → play everything. Epidemics move through cities and grow worse when they return home.' : 'Каждый ход: колода → перекрёсток → разыграть всё. Эпидемии ходят по городам и становятся злее, когда возвращаются домой.'}</p></div></main>;
  }

  const winner = game.ended ? [...game.players].sort((a, b) => score(b) - score(a))[0] : null;
  return <main className={`game-shell ${viewMode === 'wheel' ? 'wheel-mode' : ''}`} style={viewMode === 'wheel' ? { '--wheel-bg': `url(${game.players[wheelPlayer]?.background})` } : undefined}>
    <header><div className="brand"><small className="build-version">#{BUILD_VERSION}</small><div className="header-actions"><button className="log-toggle" title="Показать/скрыть хронику" aria-label="Показать/скрыть хронику" onClick={() => setLogOpen((open) => !open)}>Л</button><button className="view-toggle" title="Переключить вид городов" aria-label="Переключить вид городов" onClick={() => setViewMode((mode) => mode === 'overview' ? 'wheel' : 'overview')}>{viewMode === 'overview' ? '◉' : '▦'}</button><button className="report-button" title="Сообщить об ошибке" aria-label="Сообщить об ошибке" onClick={() => { setBugStatus(''); setBugOpen(true); }}>{game.language === 'en' ? 'B' : 'Б'}</button></div></div><div className="crusade-meter"><span>Святая земля · поход {Math.min(game.crusadeRound, 3)}/3</span><strong>{game.crusadeRound <= 3 ? game.crusadePool : 'захвачена'} {game.crusadeRound <= 3 && <small>/ {game.crusadeLimit}</small>}</strong><i style={{ width: `${game.crusadeRound <= 3 ? (game.crusadePool / game.crusadeLimit) * 100 : 0}%` }} /></div></header>
    {game.pendingChoice && <div className="resident-choice"><strong>{game.pendingChoice.ability === 'heretic-alch' ? 'Еретик-алхимик' : game.pendingChoice.ability === 'heretic-science' ? 'Еретик-натуралист' : game.pendingChoice.ability === 'heretic-necro' ? 'Еретик-некромант' : game.pendingChoice.ability === 'inquisitor' ? 'Инквизитор' : game.pendingChoice.ability === 'recruit' ? 'Рекрутёр' : game.pendingChoice.ability === 'hare' ? 'Заяц' : game.pendingChoice.ability === 'possesed' ? 'Одержимый' : game.pendingChoice.ability === 'crossbowman' ? 'Арбалетчик' : 'Шут'} требует выбора</strong><span>{game.pendingChoice.ability === 'heretic-alch' ? 'Нажми на жителя, которого уничтожить.' : game.pendingChoice.ability === 'heretic-science' ? 'Нажми на жителя, которого переместить.' : game.pendingChoice.ability === 'heretic-necro' ? 'Выбери карту из последних пяти карт сброса.' : game.pendingChoice.ability === 'inquisitor' ? 'Нажми на жителя в своём городе для казни.' : game.pendingChoice.ability === 'recruit' ? 'Нажми на мирного жителя, чтобы отправить его в Поход, или пропусти.' : game.pendingChoice.ability === 'hare' ? 'Нажми на жителя, которого обменять.' : game.pendingChoice.ability === 'possesed' ? 'Нажми на жителя, чью способность повторить.' : game.pendingChoice.ability === 'crossbowman' ? 'Нажми на карту Перекрёстка, которую сбросить.' : 'Нажми на любую карту Перекрёстка, чтобы скопировать её свойство.'}</span>{game.pendingChoice.ability === 'recruit' && <button type="button" onClick={skipRecruiter}>Пропустить</button>}</div>}
    <section className="table"><div className="play-column"><section className={`draw-module ${game.phase === 'draw-deck' ? 'ready' : ''}`}><div className="crossroad-cards">{viewMode !== 'wheel' && <Card faceDown directClick onClick={drawDeck} />}{game.crossroads.map((card, index) => <Card card={card} key={card.uid} targetable={canChooseCrossroad(card)} selectable={game.phase === 'draw-crossroads' || canChooseCrossroad(card)} selectLabel={game.language === 'en' ? 'Select' : 'Выбрать'} onSelect={() => game.pendingChoice?.ability === 'jester' ? chooseCrossroad(index) : game.pendingChoice?.ability === 'crossbowman' ? chooseCrossbowmanCrossroad(index) : game.pendingChoice?.ability === 'hare' ? chooseHareCrossroad(index) : drawCrossroads(index)} />)}</div></section>{game.current === 0 && viewMode === 'overview' && <aside className="side-panel hand-panel"><div className="section-title"><span>Твоя рука</span><small>{game.players[0].hand.length} карт</small></div><div className="hand">{game.players[0].hand.map((card) => <Card card={card} key={card.uid} selected={selected?.uid === card.uid} selectable={game.current === 0 && game.phase === 'play' && !game.pendingChoice} selectLabel={game.language === 'en' ? 'Select' : 'Выбрать'} onSelect={() => game.current === 0 && game.phase === 'play' && !game.pendingChoice && setSelected(card)} />)}</div><p className="hint">{notice || (game.pendingChoice ? 'Выделенные жители на поле кликабельны.' : game.forcedPlay?.playerId === 0 ? `Ведьма заставляет разыграть ещё ${game.forcedPlay.cardIds.length} карты немедленно.` : selected ? `«${selected.title}»: ${selected.effect} Нажми на город — мгновенный эффект будет отмечен в Хронике.` : 'Твои карты появятся здесь.')}</p></aside>}{viewMode === 'wheel' ? <CityWheel players={game.players} currentId={game.current} wheelPlayer={wheelPlayer} setWheelPlayer={setWheelPlayer} hand={game.players[0].hand} canSelectHand={game.current === 0 && game.phase === 'play' && !game.pendingChoice} onHandSelect={(card) => game.current === 0 && game.phase === 'play' && !game.pendingChoice && setSelected(card)} cityProps={{ language: game.language, selectedCard: selected, onPlace: () => place(wheelPlayer), infections: game.infections, plaguePreview, setPlaguePreview, residentTarget: (resident) => canChooseResident(wheelPlayer, resident), onResidentTarget: chooseResident }} /> : <section className={`cities players-${Math.min(game.players.length, 4)}`} style={{ '--player-count': game.players.length }}>{game.players.map((player) => <City key={player.id} player={player} language={game.language} active={player.id === game.current} selectedCard={selected} onPlace={() => place(player.id)} infections={game.infections} plaguePreview={plaguePreview} setPlaguePreview={setPlaguePreview} residentTarget={(resident) => canChooseResident(player.id, resident)} onResidentTarget={chooseResident} />)}</section>}</div></section>
    {game.pendingChoice?.ability === 'heretic-necro' && <NecromancerModal cards={game.discard.slice(-5).filter((card) => game.pendingChoice.cardIds.includes(card.uid))} language={game.language} onChoose={chooseNecromancer} />}
    {destinationOpen && selected && <PlayDestinationModal game={game} card={selected} language={game.language} onOwnCity={() => place(game.current)} onOtherCity={(targetId) => place(targetId)} onClose={() => { setDestinationOpen(false); setSelected(null); }} />}
    {logOpen && <aside className="chronicle chronicle-bottom"><p>Хроника <i>{game.log.length}</i></p>{game.log.map((line, index) => <small key={`${line}-${index}`}>{line}</small>)}</aside>}
    {winner && <div className="ending"><div><p className="eyebrow">летописец поставил точку</p><h2>{winner.name} побеждает</h2><strong>{score(winner)} {game.language === 'en' ? 'VP' : 'ПО'}</strong><div className="scoreboard">{game.players.map((player) => <span key={player.id}><b>{player.name}</b><i>{residentCount(player)} жителей · <b className="score-total">{score(player)} {game.language === 'en' ? 'VP' : 'ПО'}</b> (<em className="vp-relic">{relicScore(player)}{game.language === 'en' ? 'H' : 'Р'}</em> + <em className="vp-resident">{residentScore(player)}{game.language === 'en' ? 'R' : 'Ж'}</em>) · {player.crusade} ✠ · {player.relics.length} реликв.</i></span>)}</div><div className="graph"><p>Победные очки по ходам</p><ScoreChart history={game.history} players={game.players} /></div><button onClick={() => setGame(freshGame(botCount, game.language ?? language, game.gameSpeed ?? gameSpeed))}>Ещё один год страданий</button></div></div>}
    {bugOpen && <div className="bug-modal" onClick={() => bugStatus !== 'sending' && setBugOpen(false)}><form onSubmit={(event) => { event.preventDefault(); submitBug(); }} onClick={(event) => event.stopPropagation()}><h2>Сообщить об ошибке</h2><p>К отчёту будет приложена последняя хроника партии.</p><textarea autoFocus value={bugText} onChange={(event) => setBugText(event.target.value)} placeholder="Что произошло? (необязательно)" maxLength="1200" />{bugStatus === 'sent' ? <strong className="bug-success">Отчёт отправлен. Спасибо!</strong> : bugStatus === 'failed' ? <strong className="bug-failed">Не удалось отправить отчёт.</strong> : null}<div><button type="button" onClick={() => setBugOpen(false)} disabled={bugStatus === 'sending'}>Отмена</button><button className="start" type="submit" disabled={bugStatus === 'sending'}>Отправить</button></div></form></div>}
  </main>;
}
