import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildDeck, FEASTS_LIBRARY, shuffle } from './cards.js';

const BUILD_VERSION = __BUILD_VERSION__;
const QUICK_RULES = {
  ru: { title: 'Краткие правила', items: ['В начале хода возьмите карту из колоды, затем выберите карту на Перекрёстке.', 'Разыгрывайте жителей в свой или чужой город; эпидемии заражают город и переходят дальше.', 'Отправляйте жителей в Поход, чтобы уменьшать общий запас и получать реликвии.', 'Когда город достигает десяти жителей, партия заканчивается. Побеждает лучший итоговый счёт.'] },
  en: { title: 'Quick rules', items: ['At the start of your turn, draw from the deck, then choose a card from the Crossroads.', 'Play residents into your own or another city; epidemics infect a city and move onward.', 'Send residents on a Crusade to reduce the shared pool and earn relics.', 'When a city reaches ten residents, the game ends. The highest final score wins.'] },
};
const FM_QUICK_RULES = {
  ru: { title: 'Краткие правила: Пиры и Черти', items: ['Со второго круга в начале хода бросьте лунный кубик. На 1 сначала разыгрываются лунные свойства, затем открывается Праздник.', 'Чудовища не являются жителями: в конце хода можно выбрать одно чудовище и одного крестоносца для боя или отказаться и принять его нападение.', 'Бой: бросьте 2 кубика и прибавьте СП крестоносца. Больше опасности — чудовище побеждено; равенство — оба выживают; меньше — крестоносец погибает, чудовище уходит.', 'Побеждённое чудовище даёт жетон Логова. Проклятые реликвии выдаются за Крестовые походы.'] },
  en: { title: 'Quick rules: Feasts and Monsters', items: ['From round two, roll the Moon die at the start of each turn. On 1, resolve lunar abilities, then reveal a Festival.', 'Monsters are not residents: at end of turn, choose one monster and one Crusader to fight, or decline and face its attack.', 'Combat: roll 2 dice and add the Crusader’s CP. Higher than Danger wins; equal means both survive; lower kills the Crusader and the monster moves on.', 'A defeated monster gives a Lair token. Cursed Relics come from completed Crusades.'] },
};

const CRUSADE_POOL = { 2: 16, 3: 16, 4: 20, 5: 23, 6: 25 };
const RELIC_VP = 6;
const RELIC_CARDS = ['hg1', 'hg2', 'hg3'];
const GAME_MODES = {
  original: { ru: 'Оригинал', en: 'Original', description: { ru: 'Базовая игра с Эпидемиями.', en: 'The base game with Epidemics.' }, removeEpidemics: false },
  feasts: { ru: 'Пиры и Черти', en: 'Feasts and Monsters', description: { ru: '', en: '' }, removeEpidemics: true, includeFeasts: true, excludeIds: ['plague_doc', 'peasant'] },
};
const CITY_BACKGROUNDS = Object.entries(import.meta.glob('/public/assets/ui/c*.webp', { eager: true, query: '?url', import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => url);

function freshGame(botCount, language = 'ru', gameSpeed = 5, gameMode = 'original') {
  const mode = GAME_MODES[gameMode] || GAME_MODES.original;
  const deck = shuffle(buildDeck(mode));
  const expansionRelics = FEASTS_LIBRARY.filter((card) => card.relic);
  const festivalDeck = mode.includeFeasts ? shuffle(FEASTS_LIBRARY.filter((card) => card.festival)) : [];
  const names = language === 'en' ? ['You', ...Array.from({ length: 5 }, (_, index) => `B${index + 1}`)] : ['Вы', ...Array.from({ length: 5 }, (_, index) => `Б${index + 1}`)];
  const players = Array.from({ length: botCount + 1 }, (_, id) => ({ id, name: names[id], bot: id > 0, city: [], hand: [], crusade: 0, relics: [], lairs: [] }));
  shuffle(CITY_BACKGROUNDS).slice(0, players.length).forEach((background, index) => { players[index].background = background; });
  return {
    deck: deck.slice(3),
    crossroads: deck.slice(0, 3),
    players,
    current: 0,
    turn: 1,
    phase: 'draw-deck',
    infections: [],
    discard: [],
    relicDeck: shuffle(mode.includeFeasts ? expansionRelics : [...RELIC_CARDS]),
    festivalDeck,
    festivalDiscard: [],
    monsters: [],
    forcedPlay: null,
    pendingChoice: null,
    crusadePool: CRUSADE_POOL[players.length],
    crusadeLimit: CRUSADE_POOL[players.length],
    crusadeRound: 1,
    history: [{ label: 'начало', scores: players.map(score), crusade: players.map(() => 0) }],
    log: ['В городе пахнет дымом, навозом и возможностью.'],
    playedCards: [],
    ended: false,
    language,
    gameSpeed,
    gameMode,
  };
}

function score(player) {
  return residentScore(player) + relicScore(player) + lairScore(player);
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
  return player.relics.reduce((total, relic) => total + (relic.vp ?? RELIC_VP), 0);
}

function lairScore(player) {
  return (player.lairs || []).reduce((total, lair) => total + (lair.vp || 0), 0);
}

function residentCount(player) {
  return player.city.filter((card) => card.id !== 'corpse').length;
}

function finalWinnerCompare(a, b) {
  return score(b) - score(a)
    || relicScore(b) - relicScore(a)
    || b.crusade - a.crusade
    || residentCount(b) - residentCount(a);
}

function tieBreakReason(players, winner, english) {
  const tied = players.filter((player) => score(player) === score(winner));
  if (tied.length < 2) return null;
  if (tied.some((player) => player.relics.length !== winner.relics.length)) return english ? 'Won the tie-break with more relics.' : 'Победа по тай-брейку: больше реликвий.';
  if (tied.some((player) => player.crusade !== winner.crusade)) return english ? 'Won the tie-break with more Crusade points.' : 'Победа по тай-брейку: больше очков Похода.';
  if (tied.some((player) => residentCount(player) !== residentCount(winner))) return english ? 'Won the tie-break with more citizens.' : 'Победа по тай-брейку: больше жителей.';
  return english ? 'All tie-breakers were equal.' : 'Все показатели тай-брейка равны.';
}

function victoryFlavor(game, winner, english) {
  const log = (game.log || []).join(' ');
  const moments = [];
  if (/эпидем|plague|cholera|leprosy|malaria|сифилис/i.test(log)) moments.push(english ? 'The plagues came, and your city kept breathing.' : 'Эпидемии пришли — а твой город всё ещё дышит.');
  if (/чудовищ|monster|дракон|василиск|гигант|мантикора|русал/i.test(log)) moments.push(english ? 'Monsters prowled the streets; your people stood their ground.' : 'Чудовища рыскали по улицам, но твои люди выстояли.');
  if ((winner.relics || []).length) moments.push(english ? `${winner.relics.length} relic${winner.relics.length === 1 ? '' : 's'} now belong to your legend.` : `В твою легенду вош${winner.relics.length === 1 ? 'ла' : 'ли'} ${winner.relics.length} реликви${winner.relics.length === 1 ? 'я' : 'и'}.`);
  if (winner.crusade) moments.push(english ? `You sent the faithful to the Crusade and earned ${winner.crusade} points.` : `Ты отправил жителей в Поход и заработал ${winner.crusade} очк. Похода.`);
  return moments[0] || (english ? 'Against all sensible odds, your city became a legend.' : 'Вопреки здравому смыслу твой город стал легендой.');
}

const WOMEN = new Set(['lady', 'harlot', 'devka', 'witch', 'merchant']);
const epidemicPriority = (card, infection) => card.id === 'syphilis'
  ? (infection?.syphilisBoosted ? 'усиленная эпидемия' : 'обычная эпидемия')
  : ({ cholera: 'сначала простолюдины', leprosy: 'сначала священники', malaria: 'сначала дворяне', black_pox: 'сначала высокий иммунитет', bubonic_plague: 'по 2 жертвы в первый ход' }[card.id] || 'обычный порядок');

function recordHistory(game, label) {
  game.history.push({ label, scores: game.players.map(score), crusade: game.players.map((player) => player.crusade) });
}

function Card({ card, small = false, onClick, onSelect, selected, targetable = false, selectable = false, selectLabel = 'Select', faceDown = false, directClick = false, className = '' }) {
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
  if (faceDown) return <button className={`card back ${small ? 'small' : ''} ${zoomed ? 'zoomed' : ''} ${className}`} onClick={handleClick} aria-label="Колода" />;
  const confirm = (event) => {
    event.stopPropagation();
    setZoomed(false);
    (onSelect || onClick)?.(event);
  };
  return <>
    <button className={`card ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${targetable ? 'targetable' : ''} ${card.epidemic ? 'epidemic' : ''} ${className}`} onClick={handleClick} title={`${card.title}: ${card.effect}`}>
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

function City({ player, active, selectedCard, onPlace, infections = [], monsters = player.monsters || [], plaguePreview, setPlaguePreview, residentTarget, onResidentTarget, language = 'ru' }) {
  const estates = ['дворяне', 'священники', 'простолюдины'];
  const english = language === 'en';
  return <section className={`city ${active ? 'active' : ''} ${player.id === 0 ? 'human-city' : ''} ${selectedCard ? 'place-target' : ''}`} onClickCapture={(event) => selectedCard && !event.target.closest('.city-head') && onPlace()}>
    <button className="city-head" onClick={onPlace} disabled={!selectedCard}>
      <span>{player.name} ({score(player)} {english ? 'VP' : 'ПО'} <em className="vp-relic">{relicScore(player)}{english ? 'H' : 'Р'}</em> + <em className="vp-resident">{residentScore(player)}{english ? 'R' : 'Ж'}</em> · {player.crusade} ✠)</span>
    </button>
    {infections.filter((infection) => infection.host === player.id).map((infection) => <div className="infection" key={infection.card.uid} onMouseEnter={() => setPlaguePreview(true)} onMouseLeave={() => setPlaguePreview(false)} onClick={() => setPlaguePreview((open) => !open)} title="Нажмите или наведите для просмотра карты эпидемии"><span>☠</span><strong>{infection.card.title}</strong><em>{infection.power} жертв. · {epidemicPriority(infection.card, infection)}</em>{plaguePreview && <div className="plague-preview"><img src={infection.card.art} alt={infection.card.title} /><b>{infection.card.title}</b><small>{infection.card.effect}</small></div>}</div>)}
    {monsters.filter((monster) => monster.host === player.id).map((monster) => <div className="monster" key={monster.uid} title={`${monster.card.title}: опасность ${monster.card.danger} · голод ${monster.hunger}`}><Card card={monster.card} small className="monster-card" /><div className="monster-meta"><strong>{monster.card.title}</strong><span>☠ опасность {monster.card.danger}</span><span>голод {monster.hunger}</span></div></div>)}
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
      <div className="destination-actions"><button onClick={onOwnCity}>{english ? 'Play in your city' : 'Разыграть в своём городе'}</button>{card.id !== 'bandit' && <button onClick={() => setShowOthers(true)}>{english ? 'Send to another city' : 'Отправить в другой город'}</button>}</div>
      {showOthers && <div className="opponent-list">{others.map((player) => <button className="opponent-choice" key={player.id} onClick={() => onOtherCity(player.id)}><strong>{player.name}</strong><span>{score(player)} {english ? 'VP' : 'ПО'} · {player.city.length} {english ? 'residents' : 'жит.'}</span><small>{english ? 'Nobles / clergy / commoners' : 'Дворяне / священники / простолюдины'}: {composition(player)}</small></button>)}</div>}
      <button className="destination-cancel" onClick={onClose}>{english ? 'Cancel' : 'Отмена'}</button>
    </div>
  </div>, document.body);
}

function MinstrelTargetModal({ game, actorId, language, onChoose }) {
  const english = language === 'en';
  const opponents = game.players.filter((player) => player.id !== actorId);
  return createPortal(<div className="destination-modal" role="dialog" aria-label={english ? 'Choose a city to steal from' : 'Выбор города для кражи'}>
    <div className="destination-panel">
      <h2>{english ? 'Choose a city' : 'Выбери город'}</h2>
      <p className="destination-card-name">{english ? 'Steal up to 3 CP' : 'Украсть до 3 очков Похода'}</p>
      <div className="opponent-list">{opponents.map((player) => <button className="opponent-choice" key={player.id} onClick={() => onChoose(player.id)}>
        <strong>{player.name}</strong>
        <span>{score(player)} {english ? 'VP' : 'ПО'} · {player.crusade} CP</span>
        <small>{english ? 'Choose this city as the theft target.' : 'Выбери этот город целью кражи.'}</small>
      </button>)}</div>
    </div>
  </div>, document.body);
}

function NecromancerModal({ cards, language, onChoose }) {
  const english = language === 'en';
  const [selectedUid, setSelectedUid] = useState(null);
  return createPortal(<div className="destination-modal" role="dialog" aria-label={english ? 'Choose a discarded card' : 'Выбор карты из сброса'}>
    <div className="destination-panel discard-choice-panel">
      <h2>{english ? 'Choose a card to resurrect' : 'Выбери карту для возвращения'}</h2>
      <div className="discard-choice-cards">{cards.map((card) => <Card card={card} key={card.uid} directClick onClick={() => setSelectedUid(card.uid)} selected={selectedUid === card.uid} />)}</div>
      <button className="necromancer-confirm" type="button" disabled={!selectedUid} onClick={() => onChoose(selectedUid)}>{english ? 'Resurrect selected card' : 'Вернуть выбранную карту'}</button>
    </div>
  </div>, document.body);
}

function EstateChoiceModal({ language, onChoose }) {
  const english = language === 'en';
  const estates = english
    ? [['дворяне', 'Nobility'], ['священники', 'Clergy'], ['простолюдины', 'Commoners']]
    : [['дворяне', 'Дворяне'], ['священники', 'Священники'], ['простолюдины', 'Простолюдины']];
  return createPortal(<div className="destination-modal" role="dialog" aria-label={english ? 'Choose the Baby estate' : 'Выбор сословия Младенца'}>
    <div className="destination-panel">
      <h2>{english ? 'Choose the Baby’s estate' : 'Выбери сословие Младенца'}</h2>
      <p className="destination-card-name">{english ? 'The Baby may belong to any estate.' : 'Младенец может принадлежать к любому сословию.'}</p>
      <div className="destination-actions">{estates.map(([id, label]) => <button key={id} onClick={() => onChoose(id)}>{label}</button>)}</div>
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

function Lobby({ language, setLanguage, botCount, setBotCount, gameSpeed, setGameSpeed, gameMode, setGameMode, start }) {
  const english = language === 'en';
  const mode = GAME_MODES[gameMode];
  return <main className="welcome"><div className="lobby-meta"><div className="option-group"><span>{english ? 'Language' : 'Язык'}</span><div className="segmented"><button className={language === 'ru' ? 'picked' : ''} onClick={() => setLanguage('ru')}>RU</button><button className={language === 'en' ? 'picked' : ''} onClick={() => setLanguage('en')}>EN</button></div></div></div><div className="welcome-card"><p className="eyebrow">{english ? 'A tabletop game, rebuilt from the ashes' : 'Настольная игра, восставшая из пепла'}</p><p className="lede">{english ? 'Medieval city-building, if human life cost roughly half a card.' : 'Средневековое градостроительство, если человеческая жизнь стоила примерно пол-карты.'}</p><div className="lobby-options"><div className="option-group"><span>{english ? 'Ruleset' : 'Режим игры'}</span><div className="segmented"><button className={gameMode === 'original' ? 'picked' : ''} onClick={() => setGameMode('original')}>{GAME_MODES.original[language]}</button><button className={gameMode === 'feasts' ? 'picked' : ''} onClick={() => setGameMode('feasts')}>{GAME_MODES.feasts[language]}</button></div><small className="mode-description">{mode.description[language]}</small></div></div><div className="bot-picker"><span>{english ? 'Opponents' : 'Соперники'}</span>{[1, 2, 3, 4, 5].map((count) => <button key={count} className={botCount === count ? 'picked' : ''} onClick={() => setBotCount(count)}>{count}</button>)}</div><div className="lobby-speed option-group"><span>{english ? 'Game speed' : 'Скорость игры'}</span><div className="segmented"><button className={gameSpeed === 5 ? 'picked' : ''} onClick={() => setGameSpeed(5)}>5s</button><button className={gameSpeed === 10 ? 'picked' : ''} onClick={() => setGameSpeed(10)}>10s</button></div></div><button className="start" onClick={start}>{english ? 'Found a city' : 'Основать город'} <span>→</span></button><p className="rules">{mode.description[language]}</p></div></main>;
}

function App() {
  const [botCount, setBotCountState] = useState(3);
  const setBotCount = (count) => setBotCountState(Math.max(2, count));
  const [language, setLanguage] = useState('ru');
  const [gameSpeed, setGameSpeed] = useState(5);
  const [gameMode, setGameMode] = useState('original');
  const [viewMode, setViewMode] = useState('overview');
  const [wheelPlayer, setWheelPlayer] = useState(0);
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
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
      const cardInfo = (card) => card ? {
        id: card.id, uid: card.uid, title: card.title, type: card.type,
        vp: card.vp, crusade: card.crusade, epidemic: !!card.epidemic,
      } : null;
      const debug = game ? {
        phase: game.phase,
        turn: game.turn,
        currentPlayer: game.current,
        currentPlayerName: game.players?.find((player) => player.id === game.current)?.name || null,
        flags: { ended: !!game.ended, forcedPlay: !!game.forcedPlay, pendingChoice: !!game.pendingChoice },
        pending: game.pendingChoice || null,
        response: null,
        deck: game.deck?.length || 0,
        crossroads: (game.crossroads || []).map(cardInfo),
        discard: (game.discard || []).slice(-30).map(cardInfo),
        infections: (game.infections || []).map((infection) => ({ card: cardInfo(infection.card), host: infection.host, origin: infection.origin, power: infection.power })),
        playedCards: (game.playedCards || []).slice(-60),
        players: (game.players || []).map((player) => ({
          id: player.id, name: player.name, isBot: !!player.bot,
          handSize: player.hand?.length || 0,
          hand: (player.hand || []).map(cardInfo),
          city: (player.city || []).map(cardInfo),
          crusade: player.crusade || 0,
          relics: player.relics || [],
        })),
      } : null;
      const response = await fetch('/api/bugreport', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: bugText, version: BUILD_VERSION, project: 'suffering-reborn', language: game?.language, url: window.location.href, userAgent: navigator.userAgent, history: (game?.log || []).slice(-30), debug, game: game ? { turn: game.turn, pending: game.pendingChoice?.ability || null, response: null, deck: game.deck?.length || 0 } : null }) });
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
      next.players[next.current].hand.forEach((item) => { item.drawnFromDeck = false; });
      card.drawnFromDeck = true;
      next.players[next.current].hand.push(card);
      next.phase = 'draw-crossroads';
    });
    say('Теперь выбери одну карту с перекрёстка.');
  }

  function drawCrossroads(index) {
    if (game.phase !== 'draw-crossroads' || current.bot) return;
    update((next) => {
      const card = next.crossroads.splice(index, 1)[0];
      if (!card) return;
      next.players[next.current].hand.push(card);
      refillCrossroads(next);
      next.phase = 'play';
    });
    say('Разыграй обе карты. В свой город или в чужой.');
  }

  function place(targetId) {
    if (!selected || game.phase !== 'play' || current.bot) return;
    if (selected.id === 'bandit' && targetId !== game.current) {
      say('Разбойника можно поселить только в свой город.');
      return;
    }
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
    if (!['heretic-alch', 'heretic-science', 'inquisitor', 'recruit', 'hare', 'possesed', 'driver', 'fanatic'].includes(choice.ability)) return false;
    if (choice.ability === 'hare' && choice.residentUid) return false;
    if (choice.ability === 'driver') {
      const adjacentIds = adjacentPlayers(game, choice.targetId).map((player) => player.id);
      if (!choice.residentUid) return adjacentIds.includes(playerId) && resident.uid !== choice.cardUid;
      return adjacentIds.includes(playerId) && playerId !== choice.sourceCityId && resident.estate === choice.estate;
    }
    if (choice.ability === 'fanatic') return playerId !== choice.targetId
      && resident.estate === 'простолюдины' && resident.crusade > 0
      && adjacentPlayers(game, choice.targetId).some((player) => player.id === playerId);
    if (choice.ability === 'hare') return playerId === choice.targetId;
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
      if (!['recruit', 'hare', 'driver'].includes(choice.ability)) next.pendingChoice = null;
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
      } else if (choice.ability === 'driver') {
        if (!choice.residentUid) {
          choice.residentUid = resident.uid;
          choice.sourceCityId = playerId;
          choice.estate = resident.estate;
          next.log.unshift(`${actor.name} выбирает «${resident.title}» в городе ${victimCity.name}. Теперь выбери жителя того же сословия в другом соседнем городе.`);
        } else {
          const sourceCity = next.players[choice.sourceCityId];
          const first = sourceCity.city.find((item) => item.uid === choice.residentUid);
          if (!first || resident.estate !== choice.estate) return;
          sourceCity.city = sourceCity.city.filter((item) => item.uid !== first.uid);
          victimCity.city = victimCity.city.filter((item) => item.uid !== resident.uid);
          advanceAdaptable(first);
          advanceAdaptable(resident);
          sourceCity.city.push(resident);
          victimCity.city.push(first);
          next.pendingChoice = null;
          next.log.unshift(`${actor.name} меняет «${first.title}» на «${resident.title}» между городами ${sourceCity.name} и ${victimCity.name}.`);
        }
      } else if (choice.ability === 'fanatic') {
        const destination = next.players[choice.targetId];
        moveResident(next, victimCity, destination, resident, `✦ Фанатик переманивает «${resident.title}» из города ${victimCity.name}.`);
        next.pendingChoice = null;
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

  function chooseMinstrelTarget(targetId) {
    if (game?.pendingChoice?.ability !== 'minstrel') return;
    update((next) => {
      const choice = next.pendingChoice;
      const actor = next.players[choice.actorId];
      const victim = next.players[targetId];
      if (!actor || !victim || victim.id === actor.id) return;
      const stolen = Math.min(3, Math.max(0, victim.crusade));
      victim.crusade -= stolen;
      actor.crusade += stolen;
      next.pendingChoice = null;
      next.phase = 'play';
      next.log.unshift(stolen
        ? `✦ Менестрель крадёт ${stolen} очк. Похода у города ${victim.name}.`
        : `✦ Менестрель не крадёт очки Похода: у города ${victim.name} их нет.`);
      if (!actor.hand.length && next.current === actor.id) endTurn(next);
    });
  }

  function chooseBabyEstate(estate) {
    if (!['baby-estate', 'flexible-estate'].includes(game?.pendingChoice?.ability)) return;
    update((next) => {
      const choice = next.pendingChoice;
      const actor = next.players[choice.actorId];
      const target = next.players[choice.targetId];
      const resident = target?.city.find((item) => item.uid === choice.cardUid);
      if (!actor || !target || !resident || !choice.estateOptions.includes(estate)) return;
      resident.estate = estate;
      next.pendingChoice = null;
      next.phase = 'play';
      next.log.unshift(`✦ ${actor.name} определяет «${resident.title}» в сословие «${estate}».`);
      if (resident.id === 'baby') {
        const victim = target.city.find((item) => item.uid !== resident.uid && ['lady', 'harlot', 'devka'].includes(item.id));
        if (victim) discardResident(next, target, victim, `✦ Младенец изгоняет женщину из сословия «${estate}»`);
      } else resolveEntryAbility(next, choice.actorId, choice.targetId, resident);
      if (!next.forcedPlay && !actor.hand.length && next.current === actor.id) endTurn(next);
    });
    setNotice('Сословие выбрано.');
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
    return Boolean(card) && (['jester', 'crossbowman'].includes(choice?.ability) && !card.epidemic
      || choice?.ability === 'hare' && Boolean(choice.residentUid) && !card.epidemic);
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

  function rollDie() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function monsterVictims(monster, city) {
    const living = city.city.filter((card) => !['corpse', 'ghost', 'mermaid'].includes(card.id));
    const priority = monster.card.id === 'basilysk'
      ? (card) => ['cat', 'midget', 'unicorn'].includes(card.id)
      : monster.card.id === 'dragon'
        ? (card) => WOMEN.has(card.id) || card.id === 'adaptable'
        : monster.card.id === 'giant'
          ? (card) => ['baby', 'midget'].includes(card.id)
          : monster.card.id === 'manticore'
            ? (card) => card.crusade > 0 && card.id !== 'warhorse'
            : () => false;
    return living.sort((a, b) => Number(priority(b)) - Number(priority(a)) || b.vp - a.vp);
  }

  function resolveMonsters(next, decision = null) {
    if (next.gameMode !== 'feasts' || !next.monsters?.length) return;
    const cityMonsters = next.monsters.filter((monster) => monster.host === next.current);
    if (!cityMonsters.length) return;
    const city = next.players[next.current];
    const crusaders = city.city.filter((card) => card.crusade > 0 && card.id !== 'warhorse' && !['ghost', 'mermaid'].includes(card.id));
    if (!decision && crusaders.length && !city.bot) {
      next.pendingChoice = { ability: 'monster-combat', playerId: next.current, monsterUids: cityMonsters.map((monster) => monster.uid) };
      next.phase = 'choice';
      next.log.unshift('☠ Выберите чудовище для боя или примите его нападение.');
      return;
    }
    const selectedUid = decision?.monsterUid || cityMonsters[0].uid;
    const selected = cityMonsters.find((monster) => monster.uid === selectedUid) || cityMonsters[0];
    const otherCount = cityMonsters.length - 1;
    let defeated = false;
    if (decision?.fight || (!decision && city.bot && crusaders.length)) {
      const crusader = crusaders.sort((a, b) => b.crusade - a.crusade || b.vp - a.vp)[0];
      const dice = [rollDie(), rollDie()];
      const danger = selected.card.danger + otherCount;
      const total = dice[0] + dice[1] + crusader.crusade;
      next.log.unshift(`⚔ ${crusader.title} бросает ${dice.join(' + ')} + ${crusader.crusade} против опасности ${danger}.`);
      if (total > danger) {
        city.city = city.city.filter((card) => card.uid !== crusader.uid);
        next.discard.push(crusader);
        city.lairs = city.lairs || [];
        city.lairs.push({ id: selected.uid, title: `Логово: ${selected.card.title}`, vp: selected.card.danger });
        next.log.unshift(`⚔ ${city.name} уничтожает «${selected.card.title}» и получает жетон логова.`);
        defeated = true;
      } else if (total < danger) {
        discardResident(next, city, crusader, `⚔ ${selected.card.title} побеждает крестоносца`);
      } else next.log.unshift(`⚔ Бой с «${selected.card.title}» заканчивается вничью; оба выживают.`);
    } else {
      const victims = monsterVictims(selected, city).slice(0, selected.hunger || 1);
      victims.forEach((victim) => discardResident(next, city, victim, `☠ ${selected.card.title} пожирает жертву`));
    }
    const remaining = next.monsters.filter((monster) => monster.host !== next.current || (!defeated && monster.uid !== selected.uid));
    next.monsters = remaining.map((monster) => {
      if (monster.host !== next.current) return monster;
      const host = (monster.host + 1) % next.players.length;
      const hunger = host === monster.origin ? (monster.hunger || 1) + 1 : (monster.hunger || 1);
      next.log.unshift(`☠ ${monster.card.title} переходит в город ${next.players[host].name}.`);
      return { ...monster, host, hunger };
    });
    next.players.forEach((player) => { player.monsters = next.monsters.filter((monster) => monster.host === player.id); });
  }

  function resolveFestival(next) {
    if (next.gameMode !== 'feasts' || !next.festivalDeck?.length) return;
    const festival = next.festivalDeck.shift();
    next.festivalDiscard.push(festival);
    next.log.unshift(`🌙 Событие: «${festival.title}».`);
    if (festival.id === 'all_saints') {
      next.players.forEach((player) => {
        player.city.filter((card) => card.id === 'ghost').forEach((ghost) => discardResident(next, player, ghost, '✝ День всех святых'));
      });
    } else if (festival.id === 'tournament') {
      triggerCrusade(next, next.current, true);
    }
    if (!next.festivalDeck.length) next.festivalDeck = shuffle(next.festivalDiscard.splice(0));
  }

  function endTurn(next) {
    resolveEpidemics(next);
    resolveMonsters(next);
    if (next.pendingChoice?.ability === 'monster-combat') return;
    if (next.gameMode === 'feasts' && (next.turn || 1) >= 2 && rollDie() === 1) resolveFestival(next);
    if (next.players.some((player) => residentCount(player) >= 10)) {
      recordHistory(next, 'конец');
      next.ended = true;
      next.phase = 'ended';
      next.log.unshift('Город разросся до десяти жителей. История заканчивается.');
      return;
    }
    recordHistory(next, `ход ${next.history.length}`);
    if (next.current === next.players.length - 1) next.turn = (next.turn || 1) + 1;
    next.current = (next.current + 1) % next.players.length;
    next.phase = 'draw-deck';
  }

  function chooseMonsterCombat(fight, monsterUid) {
    if (game?.pendingChoice?.ability !== 'monster-combat') return;
    update((next) => {
      next.pendingChoice = null;
      resolveMonsters(next, { fight, monsterUid });
      if (next.gameMode === 'feasts' && (next.turn || 1) >= 2 && rollDie() === 1) resolveFestival(next);
      if (next.players.some((player) => residentCount(player) >= 10)) {
        next.ended = true;
        next.phase = 'ended';
        return;
      }
      recordHistory(next, `ход ${next.history.length}`);
      if (next.current === next.players.length - 1) next.turn = (next.turn || 1) + 1;
      next.current = (next.current + 1) % next.players.length;
      next.phase = 'draw-deck';
    });
    setNotice(fight ? 'Бой завершён.' : 'Чудовище напало и ушло дальше.');
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
      pilgrims.filter((card) => card.id === 'guard').forEach(() => revealGuardCard(next, player, 'Стражник отправлен в Поход'));
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
    const relic = next.relicDeck.shift() || RELIC_CARDS[(next.crusadeRound - 1) % RELIC_CARDS.length];
    winner.relics.push(relic);
    next.log.unshift(`${winner.name} получает Реликвию: +${relic.vp ?? RELIC_VP} ПО в конце игры.`);
    next.players.forEach((player) => { player.crusade = 0; });
    next.crusadeRound += 1;
    next.crusadePool = next.crusadeRound <= 3 ? next.crusadeLimit : 0;
    return true;
  }

  function discardResident(next, player, resident, reason) {
    if (resident.id !== 'ghost' && player.relics.some((relic) => relic.id === 'nercomicon') && !player.relicState?.nercomiconUsed) {
      const roll = rollDie();
      player.relicState = { ...(player.relicState || {}), nercomiconUsed: true };
      if (roll === 6) {
        next.log.unshift(`☠ Некрономикон спасает «${resident.title}» (бросок 6).`);
        return;
      }
      next.log.unshift(`☠ Некрономикон не спасает «${resident.title}» (бросок ${roll}).`);
    }
    player.city = player.city.filter((item) => item.uid !== resident.uid);
    if (resident.id === 'guard' && player.imprisoned?.length) {
      revealGuardCard(next, player);
    }
    next.discard.push(resident);
    next.log.unshift(`${reason}: «${resident.title}» отправляется в сброс.`);
  }

  function revealGuardCard(next, player, messagePrefix = 'Стражник сброшен') {
    const hidden = player.imprisoned?.shift();
    if (!hidden) return;
    next.log.unshift(`✦ ${messagePrefix}: карта «${hidden.title}» раскрывается и срабатывает.`);
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

  function sendResidentOnCrusade(next, player, resident, points = resident.crusade || Math.max(0, resident.vp), recipient = player) {
    if (!resident) return 0;
    player.city = player.city.filter((item) => item.uid !== resident.uid);
    if (resident.id === 'guard') revealGuardCard(next, player, 'Стражник отправлен в Поход');
    next.discard.push(resident);
    // The resident's full value counts toward the final score, even when it
    // crosses the remaining Holy Land threshold. Only the shared pool floors
    // at zero; otherwise the threshold-crossing player would be unfairly
    // reduced to the last single point.
    const sent = Math.max(0, points);
    recipient.crusade += sent;
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
    const flexible = ['baby', 'harlot', 'unicorn'].includes(card.id);
    if (flexible && !card.estate) {
      const estateOptions = ['дворяне', 'священники', 'простолюдины'];
      if (owner.bot) {
        card.estate = estateOptions.sort((a, b) => target.city.filter((resident) => resident.estate === a).length - target.city.filter((resident) => resident.estate === b).length)[0];
        activate(`определён в сословие «${card.estate}».`);
      } else {
        next.pendingChoice = { ability: 'flexible-estate', actorId: ownerId, targetId, cardUid: card.uid, estateOptions };
        next.phase = 'choice';
        activate('выбери сословие для этого жителя.');
        return;
      }
    }
    const mutilator = target.city.find((resident) => resident.id === 'mutilator' && resident.uid !== card.uid);
    if (card.id === 'witch') {
      const drawn = next.deck.splice(0, 2);
      drawn.forEach((drawnCard) => target.hand.push(drawnCard));
      const resumeCurrent = next.current === targetId ? null : next.current;
      next.forcedPlay = drawn.length ? { playerId: targetId, cardIds: drawn.map((drawnCard) => drawnCard.uid), resumeCurrent, source: 'witch' } : null;
      if (drawn.length && targetId !== next.current) {
        next.current = targetId;
        next.phase = 'play';
      }
      activate(`${target.name} получает ${drawn.length} карты из колоды и должен разыграть их немедленно.`);
    }
    if (card.id === 'lady') {
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((resident) => resident.id === 'knight'));
      const knight = adjacent?.city.find((resident) => resident.id === 'knight');
      if (knight) activate(`отправляет Рыцаря из города ${adjacent.name} в Поход за ${sendResidentOnCrusade(next, adjacent, knight, undefined, owner)} очк.`);
    } else if (card.id === 'driver') {
      const available = target.city.filter((item) => item.uid !== card.uid && item.id !== 'corpse')
        .map((resident) => ({ resident, adjacent: adjacentPlayers(next, targetId).find((player) => player.city.some((item) => item.estate === resident.estate)) }))
        .find((entry) => entry.adjacent);
      if (target.bot) {
        const resident = available?.resident;
        const adjacent = available?.adjacent;
        const replacement = adjacent?.city.find((item) => item.estate === resident?.estate);
        if (resident && replacement) {
          target.city = target.city.filter((item) => item.uid !== resident.uid); adjacent.city = adjacent.city.filter((item) => item.uid !== replacement.uid);
          advanceAdaptable(resident);
          advanceAdaptable(replacement);
          target.city.push(replacement); adjacent.city.push(resident); activate(`меняет жителей сословия «${resident.estate}» с городом ${adjacent.name}.`);
        } else activate('не находит подходящую пару жителей одного сословия для обмена.');
      } else if (available) {
        next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid };
        next.phase = 'choice';
        activate('выбери жителя этого города для обмена, затем жителя того же сословия в соседнем городе.');
      } else activate('не находит соседний город с жителем того же сословия для обмена.');
    } else if (card.id === 'minstrel') {
      const opponents = next.players.filter((player) => player.id !== ownerId);
      if (owner.bot) {
        const victim = opponents.sort((a, b) => b.crusade - a.crusade)[0];
        const stolen = Math.min(3, victim?.crusade || 0);
        if (victim && stolen) { victim.crusade -= stolen; owner.crusade += stolen; activate(`крадёт ${stolen} очк. Похода у города ${victim.name}.`); }
        else activate('не крадёт очки Похода: у других городов их нет.');
      } else if (opponents.length) {
        next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid };
        next.phase = 'choice';
        activate('выбери город, у которого украсть до 3 очков Похода.');
      } else activate('не находит другого города для кражи.');
    } else if (card.id === 'troubadur') {
      let stolen = 0;
      next.players.forEach((player) => {
        if (player.id === targetId || player.crusade <= 0) return;
        player.crusade -= 1;
        target.crusade += 1;
        stolen += 1;
      });
      if (stolen) activate(`крадёт по 1 очку Похода у каждого города с очками (${stolen} всего).`);
      else activate('не крадёт очки Похода: у других городов их нет.');
    } else if (card.id === 'harlot') {
      const victim = target.city.find((resident) => resident.uid !== card.uid && WOMEN.has(resident.id));
      if (victim) discardResident(next, target, victim, '✦ Распутная девка сбрасывает женщину');
      else activate('не находит женщину в городе.');
    } else if (card.id === 'devka') {
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((resident) => resident.id === 'monk'));
      const monk = adjacent?.city.find((resident) => resident.id === 'monk');
      if (monk) moveResident(next, adjacent, target, monk, `✦ ${card.title} переманивает Монаха из города ${adjacent.name}.`);
    } else if (card.id === 'fanatic') {
      const adjacent = adjacentPlayers(next, targetId).filter((player) => player.city.some((resident) => resident.estate === 'простолюдины' && resident.crusade > 0));
      if (target.bot) {
        const source = adjacent[0];
        const resident = source?.city.filter((item) => item.estate === 'простолюдины' && item.crusade > 0).sort((a, b) => b.crusade - a.crusade || b.vp - a.vp)[0];
        if (resident) moveResident(next, source, target, resident, `✦ Фанатик переманивает крестоносца из города ${source.name}.`);
      } else if (adjacent.length) {
        next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid };
        next.phase = 'choice';
        activate('выбери простолюдина-крестоносца из соседнего города для переманивания.');
      }
    } else if (card.id === 'kolya') {
      adjacentPlayers(next, targetId).forEach((adjacent) => {
        const woman = adjacent.city.find((resident) => WOMEN.has(resident.id));
        if (woman) moveResident(next, adjacent, target, woman, `✦ Коля переманивает «${woman.title}» из города ${adjacent.name}.`);
      });
    } else if (card.id === 'recruit') {
      const recruits = target.city.filter((resident) => resident.uid !== card.uid && resident.crusade <= 0 && resident.id !== 'corpse');
      if (target.bot) {
        const roundBefore = next.crusadeRound;
        let sent = 0;
        const ordered = [...recruits].sort((a, b) => {
          const aPoints = Math.max(0, a.vp);
          const bPoints = Math.max(0, b.vp);
          const aWinsRelic = aPoints >= next.crusadePool && next.players.every((player) => player.id === targetId || target.crusade + aPoints >= player.crusade);
          const bWinsRelic = bPoints >= next.crusadePool && next.players.every((player) => player.id === targetId || target.crusade + bPoints >= player.crusade);
          if (aWinsRelic !== bWinsRelic) return aWinsRelic ? -1 : 1;
          if (aWinsRelic && bWinsRelic && aPoints !== bPoints) return bPoints - aPoints;
          if (a.vp < 0 || b.vp < 0) return a.vp - b.vp;
          return bPoints - aPoints;
        });
        for (const resident of ordered.slice(0, 2)) {
          sent += sendResidentOnCrusade(next, target, resident, Math.max(0, resident.vp));
          if (next.crusadeRound !== roundBefore) break;
        }
        if (sent) activate(`отправляет мирных жителей в Поход за ${sent} очк.`);
        if (next.crusadeRound !== roundBefore) activate('Святая Земля достигла лимита — распределена Реликвия.');
      } else if (recruits.length) {
        next.pendingChoice = { ability: card.id, actorId: targetId, targetId, cardUid: card.uid, recruitIds: recruits.slice(0, 2).map((resident) => resident.uid) };
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
      if (!drawn) activate('колода пуста — действие не может взять карту.');
      else if (drawn.epidemic) {
        const syphilisBoost = drawn.id === 'syphilis' && target.city.some((resident) => ['harlot', 'devka'].includes(resident.id));
        next.infections.push({ card: drawn, host: targetId, origin: targetId, power: syphilisBoost ? 2 : drawn.victims, syphilisBoosted: syphilisBoost });
        activate(`подкладывает «${drawn.title}» в город: эпидемия начинает действовать.`);
      } else { target.city.push(drawn); activate(`кладёт «${drawn.title}» в город без мгновенного свойства.`); }
    } else if (card.id === 'guard') {
      const imprisoned = next.deck.shift();
      if (imprisoned?.epidemic) {
        next.discard.push(imprisoned);
        activate(`вытягивает «${imprisoned.title}», но эпидемия отправляется в сброс.`);
      } else if (imprisoned) {
        target.imprisoned = [...(target.imprisoned || []), imprisoned];
        activate('прячет верхнюю карту колоды под Стражником.');
      }
    } else if (card.id === 'cupbearer') {
      const noble = target.city.find((resident) => resident.estate === 'дворяне' && resident.uid !== card.uid);
      const adjacent = adjacentPlayers(next, targetId).find((player) => player.city.some((resident) => resident.estate === 'простолюдины'));
      const commoner = adjacent?.city.find((resident) => resident.estate === 'простолюдины');
      if (noble && commoner) { target.city = target.city.filter((item) => item.uid !== noble.uid); adjacent.city = adjacent.city.filter((item) => item.uid !== commoner.uid); target.city.push(commoner); adjacent.city.push(noble); activate(`меняет дворянина на простолюдина из города ${adjacent.name}.`); }
    } else if (card.id === 'hare') {
      const resident = target.city.find((item) => item.uid !== card.uid);
      const replacement = next.crossroads[0];
      if (resident && replacement) {
        if (owner.bot) {
          target.city = target.city.filter((item) => item.uid !== resident.uid); next.crossroads[0] = resident; target.city.push(replacement); activate(`меняет «${resident.title}» на «${replacement.title}» с Перекрёстка.`);
        } else {
          next.pendingChoice = { ability: card.id, actorId: ownerId, chooserId: ownerId, targetId, cardUid: card.uid };
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
      const victim = strongestResident(target, card.uid);
      const anyVictim = target.city.some((resident) => resident.uid !== card.uid && resident.id !== 'corpse');
      if (owner.bot && victim) {
          const wasHeretic = victim.id.startsWith('heretic-');
          discardResident(next, target, victim, `✦ Инквизитор ${owner.name} казнит жителя`);
          if (wasHeretic) { const drawn = next.deck.shift(); if (drawn) owner.hand.push(drawn); activate('убивает Еретика и берёт карту.'); }
      } else if (!owner.bot && anyVictim) { next.pendingChoice = { ability: card.id, actorId: ownerId, targetId, cardUid: card.uid }; next.phase = 'choice'; activate(`выбери жителя в городе ${target.name} для казни.`); }
      else activate('не находит жертву.');
    } else if (card.id === 'episcop') {
      activate('созывает общий Крестовый поход.'); triggerCrusade(next, targetId);
    } else if (card.id === 'preacher') {
      activate('созывает местный Крестовый поход.'); triggerCrusade(next, targetId, true);
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
    if (!owner || !target || !card) return false;
    if (card.id === 'bandit' && targetId !== ownerId) return false;
    if (next.forcedPlay?.playerId === ownerId && !next.forcedPlay.cardIds.includes(card.uid)) return false;
    const forcedResumeCurrent = next.forcedPlay?.playerId === ownerId ? next.forcedPlay.resumeCurrent : null;
    const handIndex = owner.hand.findIndex((item) => item.uid === card.uid);
    if (handIndex < 0) return false;
    const needsDiscardForOwnCity = ['lord', 'knight'].includes(card.id) && targetId === ownerId;
    const discardCost = needsDiscardForOwnCity ? owner.hand.find((item) => item.uid !== card.uid) : null;
    if (needsDiscardForOwnCity && !discardCost) return false;
    next.playedCards.push({
      turn: next.turn || 1,
      playerId: owner.id,
      playerName: owner.name,
      isBot: !!owner.bot,
      targetId: target?.id ?? null,
      targetName: target?.name || null,
      card: { id: card.id, uid: card.uid, title: card.title, type: card.type, vp: card.vp, crusade: card.crusade, epidemic: !!card.epidemic },
    });
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
    } else if (card.monster) {
      next.monsters = next.monsters || [];
      next.monsters.push({ card, uid: card.uid, host: targetId, origin: targetId, hunger: card.danger });
      next.players.forEach((player) => { player.monsters = next.monsters.filter((monster) => monster.host === player.id); });
      next.log.unshift(`${owner.name} выпускает «${card.title}» в городе ${target.name}.`);
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
    return true;
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
      if (!bot?.hand.length && next.phase === 'play' && !next.pendingChoice && !next.forcedPlay) {
        endTurn(next);
        return;
      }
      if (next.phase === 'draw-deck') {
        const card = next.deck.shift(); if (!card) return finish(next);
        bot.hand.forEach((item) => { item.drawnFromDeck = false; });
        card.drawnFromDeck = true;
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
        if (!card) {
          endTurn(next);
          return;
        }
        const highestScoringOpponent = [...next.players].filter((player) => player.id !== bot.id).sort((a, b) => score(b) - score(a))[0];
        const victoryLeader = [...next.players].sort((a, b) => score(b) - score(a))[0];
        const targetLeader = victoryLeader.id === bot.id ? highestScoringOpponent : victoryLeader;
        const leaderWithoutPlague = [...next.players].filter((player) => player.id !== bot.id && !next.infections.some((infection) => infection.host === player.id)).sort((a, b) => score(b) - score(a))[0];
        const isSecondSelfPlay = ['lord', 'knight'].includes(card.id) && bot.hand.filter((item) => item.uid !== card.uid).length === 0;
        const attackLeader = next.history.length > 4 && targetLeader && residentCount(targetLeader) >= 5;
        const targetId = card.id === 'plague_doc'
          ? (bot.city.some((resident) => resident.id === 'devil') ? bot.id : (leaderWithoutPlague?.id ?? targetLeader.id))
          : card.id === 'bandit' ? bot.id
          : isSecondSelfPlay ? targetLeader.id : card.epidemic ? (leaderWithoutPlague?.id ?? targetLeader.id) : (card.vp < 0 && attackLeader ? targetLeader.id : bot.id);
        play(next, bot.id, card, targetId);
        // Never leave the game in an unresolvable bot turn if a newly added
        // placement rule rejects the AI's target. Try the bot's own city,
        // then discard as a last-resort safety valve with a Chronicle entry.
        if (next.phase === 'play' && next.current === bot.id && next.players[bot.id].hand.some((item) => item.uid === card.uid)) {
          const fallbackTarget = bot.id;
          play(next, bot.id, card, fallbackTarget);
          if (next.players[bot.id].hand.some((item) => item.uid === card.uid)) {
            next.players[bot.id].hand = next.players[bot.id].hand.filter((item) => item.uid !== card.uid);
            next.discard.push(card);
            next.log.unshift(`${bot.name} не смог разыграть «${card.title}» и сбрасывает карту, чтобы продолжить ход.`);
            if (!next.players[bot.id].hand.length && next.current === bot.id) endTurn(next);
          }
        }
      }
    }), game.gameMode === 'original' && game.phase !== 'draw-deck' ? 0 : (game.gameSpeed || 5) * 1000);
    return () => clearTimeout(timer);
  }, [game, current?.bot, current?.id]);

  useEffect(() => {
    if (!game || game.ended || current?.bot || game.phase !== 'play' || game.pendingChoice || game.forcedPlay || current.hand.length) return undefined;
    update((next) => {
      if (next.phase === 'play' && !next.pendingChoice && !next.forcedPlay && !next.players[next.current]?.hand.length) endTurn(next);
    });
    return undefined;
  }, [game, current?.bot, current?.id, current?.hand.length, game?.phase, game?.pendingChoice, game?.forcedPlay]);

  useEffect(() => {
    if (!game || current?.bot || game.ended || game.phase !== 'draw-deck') return undefined;
    const timer = setTimeout(() => {
      update((next) => {
        const card = next.deck.shift();
        if (!card) return finish(next);
        next.players[next.current].hand.forEach((item) => { item.drawnFromDeck = false; });
        card.drawnFromDeck = true;
        next.players[next.current].hand.push(card);
        next.phase = 'draw-crossroads';
      });
      setNotice('Карта из колоды взята. Теперь выбери карту с Перекрёстка.');
    }, (game.gameSpeed || 5) * 1000);
    return () => clearTimeout(timer);
  }, [game, current?.bot, current?.id, game?.phase]);

  if (!game) return <Lobby language={language} setLanguage={setLanguage} botCount={botCount} setBotCount={setBotCount} gameSpeed={gameSpeed} setGameSpeed={setGameSpeed} gameMode={gameMode} setGameMode={setGameMode} start={() => setGame(freshGame(botCount, language, gameSpeed, gameMode))} />;
  if (false) {
    const english = language === 'en';
    const mode = GAME_MODES[gameMode];
    return <main className="welcome"><div className="lobby-meta"><div className="option-group"><span>{english ? 'Language' : 'Язык'}</span><div className="segmented"><button className={language === 'ru' ? 'picked' : ''} onClick={() => setLanguage('ru')}>RU</button><button className={language === 'en' ? 'picked' : ''} onClick={() => setLanguage('en')}>EN</button></div></div><small className="build-version">#{BUILD_VERSION}</small></div><div className="welcome-card"><p className="eyebrow">{english ? 'A tabletop game, rebuilt from the ashes' : 'Настольная игра, восставшая из пепла'}</p><p className="lede">{english ? 'Medieval city-building, if human life cost roughly half a card.' : 'Средневековое градостроительство, если человеческая жизнь стоила примерно пол-карты.'}</p><div className="bot-picker"><span>{english ? 'Opponents' : 'Соперники'}</span>{[1, 2, 3, 4, 5].map((count) => <button key={count} className={botCount === count ? 'picked' : ''} onClick={() => setBotCount(count)}>{count}</button>)}</div><div className="lobby-speed option-group"><span>{english ? 'Game speed' : 'Скорость игры'}</span><div className="segmented"><button className={gameSpeed === 5 ? 'picked' : ''} onClick={() => setGameSpeed(5)}>5s</button><button className={gameSpeed === 10 ? 'picked' : ''} onClick={() => setGameSpeed(10)}>10s</button></div></div><button className="start" onClick={() => setGame(freshGame(botCount, language, gameSpeed))}>{english ? 'Found a city' : 'Основать город'} <span>→</span></button><p className="rules">{english ? 'Each turn: deck → crossroads → play everything. Epidemics move through cities and grow worse when they return home.' : 'Каждый ход: колода → перекрёсток → разыграть всё. Эпидемии ходят по городам и становятся злее, когда возвращаются домой.'}</p></div></main>;
  }

  const winner = game.ended ? [...game.players].sort(finalWinnerCompare)[0] : null;
  const winnerReason = winner ? tieBreakReason(game.players, winner, game.language === 'en') : null;
  const overviewPlayers = game.players.length === 3
    ? [game.players[1], game.players[0], game.players[2]]
    : game.players.length === 4
      ? [game.players[3], game.players[0], game.players[1], game.players[2]]
      : game.players;
  return <main className={`game-shell ${viewMode === 'wheel' ? 'wheel-mode' : ''}`} style={viewMode === 'wheel' ? { '--wheel-bg': `url(${game.players[wheelPlayer]?.background})` } : undefined}>
    <header><div className="brand"><small className="build-version">#{BUILD_VERSION}</small><div className="header-actions"><button className="log-toggle" title={game.language === 'en' ? 'Toggle history' : 'Показать/скрыть хронику'} aria-label={game.language === 'en' ? 'Toggle history' : 'Показать/скрыть хронику'} onClick={() => setLogOpen((open) => !open)}>Л</button><button className="rules-toggle" title={QUICK_RULES[game.language].title} aria-label={QUICK_RULES[game.language].title} onClick={() => setRulesOpen((open) => !open)}>?</button><button className="view-toggle" title={game.language === 'en' ? 'Toggle city view' : 'Переключить вид городов'} aria-label={game.language === 'en' ? 'Toggle city view' : 'Переключить вид городов'} onClick={() => setViewMode((mode) => mode === 'overview' ? 'wheel' : 'overview')}>{viewMode === 'overview' ? '◉' : '▦'}</button><button className="report-button" title={game.language === 'en' ? 'Report a bug' : 'Сообщить об ошибке'} aria-label={game.language === 'en' ? 'Report a bug' : 'Сообщить об ошибке'} onClick={() => { setBugStatus(''); setBugOpen(true); }}>{game.language === 'en' ? 'B' : 'Б'}</button><div className="crusade-meter"><span>Святая земля</span><strong>{game.crusadeRound <= 3 ? `${Math.min(game.crusadeRound, 3)}/3 · ${game.crusadePool}/${game.crusadeLimit}` : 'захвачена'}</strong>{viewMode === 'wheel' && <small className="wheel-player-meta">{game.players[wheelPlayer]?.name} · {score(game.players[wheelPlayer])} {game.language === 'en' ? 'VP' : 'ПО'}</small>}<i style={{ width: `${game.crusadeRound <= 3 ? (game.crusadePool / game.crusadeLimit) * 100 : 0}%` }} /></div></div></div></header>
    {rulesOpen && <div className="quick-rules-modal" role="dialog" aria-label={(game.gameMode === 'feasts' ? FM_QUICK_RULES : QUICK_RULES)[game.language].title} onClick={() => setRulesOpen(false)}><section onClick={(event) => event.stopPropagation()}><button className="quick-rules-close" onClick={() => setRulesOpen(false)} aria-label={game.language === 'en' ? 'Close rules' : 'Закрыть правила'}>×</button><h2>{(game.gameMode === 'feasts' ? FM_QUICK_RULES : QUICK_RULES)[game.language].title}</h2><ul>{(game.gameMode === 'feasts' ? FM_QUICK_RULES : QUICK_RULES)[game.language].items.map((item) => <li key={item}>{item}</li>)}</ul></section></div>}
    {game.pendingChoice && !['minstrel', 'baby-estate'].includes(game.pendingChoice.ability) && <div className="resident-choice"><strong>{game.pendingChoice.ability === 'heretic-alch' ? 'Еретик-алхимик' : game.pendingChoice.ability === 'heretic-science' ? 'Еретик-натуралист' : game.pendingChoice.ability === 'heretic-necro' ? 'Еретик-некромант' : game.pendingChoice.ability === 'inquisitor' ? 'Инквизитор' : game.pendingChoice.ability === 'recruit' ? 'Рекрутёр' : game.pendingChoice.ability === 'hare' ? 'Заяц' : game.pendingChoice.ability === 'driver' ? 'Возница' : game.pendingChoice.ability === 'fanatic' ? 'Фанатик' : game.pendingChoice.ability === 'possesed' ? 'Одержимый' : game.pendingChoice.ability === 'crossbowman' ? 'Арбалетчик' : 'Шут'} требует выбора</strong><span>{game.pendingChoice.ability === 'driver' ? (game.pendingChoice.residentUid ? 'Теперь выбери жителя того же сословия в другом соседнем городе.' : 'Сначала выбери жителя в городе слева или справа.') : game.pendingChoice.ability === 'heretic-alch' ? 'Нажми на жителя, которого уничтожить.' : game.pendingChoice.ability === 'heretic-science' ? 'Нажми на жителя, которого переместить.' : game.pendingChoice.ability === 'heretic-necro' ? 'Выбери карту из последних пяти карт сброса.' : game.pendingChoice.ability === 'inquisitor' ? 'Нажми на жителя в городе для казни.' : game.pendingChoice.ability === 'recruit' ? 'Нажми на мирного жителя, чтобы отправить его в Поход, или пропусти.' : game.pendingChoice.ability === 'hare' ? 'Нажми на жителя, которого обменять.' : game.pendingChoice.ability === 'fanatic' ? 'Нажми на простолюдина-крестоносца в соседнем городе.' : game.pendingChoice.ability === 'possesed' ? 'Нажми на жителя, чью способность повторить.' : game.pendingChoice.ability === 'crossbowman' ? 'Нажми на карту Перекрёстка, которую сбросить.' : 'Нажми на любую карту Перекрёстка, чтобы скопировать её свойство.'}</span>{game.pendingChoice.ability === 'recruit' && <button type="button" onClick={skipRecruiter}>Пропустить</button>}</div>}
    {game.pendingChoice?.ability === 'monster-combat' && <div className="monster-choice"><strong>Чудовище нападает</strong><span>Выберите одно чудовище для боя или примите нападение.</span><div>{game.monsters.filter((monster) => game.pendingChoice.monsterUids.includes(monster.uid)).map((monster) => <button key={monster.uid} onClick={() => chooseMonsterCombat(true, monster.uid)}>Сразиться: {monster.card.title}</button>)}<button onClick={() => chooseMonsterCombat(false, game.pendingChoice.monsterUids[0])}>Принять нападение</button></div></div>}
    {game.pendingChoice?.ability === 'minstrel' && <MinstrelTargetModal game={game} actorId={game.pendingChoice.actorId} language={game.language} onChoose={chooseMinstrelTarget} />}
    <section className="table"><div className="play-column"><section className={`draw-module ${game.phase === 'draw-deck' ? 'ready' : ''} ${game.phase === 'play' ? 'crossroads-shrunk' : ''}`}><div className="crossroad-cards">{viewMode !== 'wheel' && <Card faceDown directClick onClick={drawDeck} />}{game.crossroads.map((card, index) => <Card card={card} className="crossroad-card" key={card.uid} targetable={canChooseCrossroad(card)} selectable={game.phase === 'draw-crossroads' || canChooseCrossroad(card)} selectLabel={game.language === 'en' ? 'Select' : 'Выбрать'} onSelect={() => game.pendingChoice?.ability === 'jester' ? chooseCrossroad(index) : game.pendingChoice?.ability === 'crossbowman' ? chooseCrossbowmanCrossroad(index) : game.pendingChoice?.ability === 'hare' ? chooseHareCrossroad(index) : drawCrossroads(index)} />)}{game.current === 0 && game.players[0].hand.map((card) => <Card card={card} key={card.uid} selected={selected?.uid === card.uid} selectable={game.phase === 'play' && !game.pendingChoice} selectLabel={game.language === 'en' ? 'Select' : 'Выбрать'} onSelect={() => game.phase === 'play' && !game.pendingChoice && setSelected(card)} />)}</div><p className="hint">{notice || (game.pendingChoice ? 'Выделенные жители на поле кликабельны.' : game.forcedPlay?.playerId === 0 ? `Ведьма заставляет разыграть ещё ${game.forcedPlay.cardIds.length} карты немедленно.` : selected ? `«${selected.title}»: ${selected.effect} Нажми на город — мгновенный эффект будет отмечен в Хронике.` : 'Твои карты появятся здесь.')}</p></section>{viewMode === 'wheel' ? <CityWheel players={game.players} currentId={game.current} wheelPlayer={wheelPlayer} setWheelPlayer={setWheelPlayer} hand={game.players[0].hand} canSelectHand={game.current === 0 && game.phase === 'play' && !game.pendingChoice} onHandSelect={(card) => game.current === 0 && game.phase === 'play' && !game.pendingChoice && setSelected(card)} cityProps={{ language: game.language, selectedCard: selected, onPlace: () => place(wheelPlayer), infections: game.infections, plaguePreview, setPlaguePreview, residentTarget: (resident) => canChooseResident(wheelPlayer, resident), onResidentTarget: chooseResident }} /> : <section className={`cities players-${Math.min(game.players.length, 4)}`} style={{ '--player-count': game.players.length }}>{overviewPlayers.map((player) => <City key={player.id} player={player} language={game.language} active={player.id === game.current} selectedCard={selected} onPlace={() => place(player.id)} infections={game.infections} plaguePreview={plaguePreview} setPlaguePreview={setPlaguePreview} residentTarget={(resident) => canChooseResident(player.id, resident)} onResidentTarget={chooseResident} />)}</section>}</div></section>
    {game.pendingChoice?.ability === 'heretic-necro' && <NecromancerModal cards={game.discard.slice(-5).filter((card) => game.pendingChoice.cardIds.includes(card.uid))} language={game.language} onChoose={chooseNecromancer} />}
    {['baby-estate', 'flexible-estate'].includes(game.pendingChoice?.ability) && <EstateChoiceModal language={game.language} onChoose={chooseBabyEstate} />}
    {destinationOpen && selected && <PlayDestinationModal game={game} card={selected} language={game.language} onOwnCity={() => place(game.current)} onOtherCity={(targetId) => place(targetId)} onClose={() => { setDestinationOpen(false); setSelected(null); }} />}
    {logOpen && <aside className="chronicle chronicle-bottom"><p>Хроника <i>{game.log.length}</i></p>{game.log.map((line, index) => <small key={`${line}-${index}`}>{line}</small>)}</aside>}
    {winner && <div className="ending"><div><p className="eyebrow">летописец поставил точку</p><h2>{winner.id === 0 ? (game.language === 'en' ? 'You won' : 'Вы победили') : (game.language === 'en' ? `${winner.name} wins` : `${winner.name} побеждает`)}</h2><strong>{score(winner)} {game.language === 'en' ? 'VP' : 'ПО'}</strong><p className="victory-flavor">{victoryFlavor(game, winner, game.language === 'en')}</p>{winnerReason && <p className="victory-reason">{winnerReason}</p>}<div className="scoreboard">{game.players.map((player) => <span key={player.id}><b>{player.name}</b><i>{residentCount(player)} жителей · <b className="score-total">{score(player)} {game.language === 'en' ? 'VP' : 'ПО'}</b> (<em className="vp-relic">{relicScore(player)}{game.language === 'en' ? 'H' : 'Р'}</em> + <em className="vp-resident">{residentScore(player)}{game.language === 'en' ? 'R' : 'Ж'}</em>) · {player.crusade} ✠ · {player.relics.length} реликв.</i></span>)}</div><div className="graph"><p>Победные очки по ходам</p><ScoreChart history={game.history} players={game.players} /></div><button onClick={() => setGame(freshGame(botCount, game.language ?? language, game.gameSpeed ?? gameSpeed))}>Ещё один год страданий</button></div></div>}
    {bugOpen && <div className="bug-modal" onClick={() => bugStatus !== 'sending' && setBugOpen(false)}><form onSubmit={(event) => { event.preventDefault(); submitBug(); }} onClick={(event) => event.stopPropagation()}><h2>Сообщить об ошибке</h2><p>К отчёту будет приложена последняя хроника партии.</p><textarea autoFocus value={bugText} onChange={(event) => setBugText(event.target.value)} placeholder="Что произошло? (необязательно)" maxLength="1200" />{bugStatus === 'sent' ? <strong className="bug-success">Отчёт отправлен. Спасибо!</strong> : bugStatus === 'failed' ? <strong className="bug-failed">Не удалось отправить отчёт.</strong> : null}<div><button type="button" onClick={() => setBugOpen(false)} disabled={bugStatus === 'sending'}>Отмена</button><button className="start" type="submit" disabled={bugStatus === 'sending'}>Отправить</button></div></form></div>}
  </main>;
}

class CrashBoundary extends React.Component {
  state = { error: null };

  componentDidMount() {
    this.handleWindowError = (event) => this.capture(event.error || new Error(event.message));
    this.handleUnhandledRejection = (event) => this.capture(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentDidCatch(error, info) {
    this.capture(error, info?.componentStack);
  }

  capture(error, componentStack = '') {
    const details = { message: error?.message || String(error), stack: error?.stack || '', componentStack, build: BUILD_VERSION, time: new Date().toISOString() };
    console.error('Suffering crashed', details);
    try { localStorage.setItem('suffering.lastCrash', JSON.stringify(details)); } catch { /* storage may be unavailable */ }
    this.setState({ error: details });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { error } = this.state;
    return <main className="crash-screen"><div><p className="eyebrow">Suffering encountered a problem</p><h1>Game interrupted</h1><p>The error was saved locally. Send this information with a bug report if it happens again.</p><pre>{JSON.stringify(error, null, 2)}</pre><button onClick={() => window.location.reload()}>Reload game</button></div></main>;
  }
}

export default function AppWithCrashBoundary() {
  return <CrashBoundary><App /></CrashBoundary>;
}
