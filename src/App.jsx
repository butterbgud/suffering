import React, { useEffect, useState } from 'react';
import { buildDeck, shuffle } from './cards.js';

const BUILD_VERSION = __BUILD_VERSION__;

const NAMES = ['Конста', 'Гертруда', 'Ульрих', 'Ингеборга', 'Тибальт', 'Матильда'];
const BOT_NAMES = ['Гертруда', 'Ульрих', 'Ингеборга', 'Тибальт', 'Матильда'];
const CRUSADE_POOL = { 2: 16, 3: 16, 4: 20, 5: 23, 6: 25 };
const RELIC_VP = 6;

function freshGame(botCount) {
  const deck = shuffle(buildDeck());
  const players = Array.from({ length: botCount + 1 }, (_, id) => ({ id, name: id ? BOT_NAMES[id - 1] : NAMES[0], bot: id > 0, city: [], hand: [], crusade: 0, relics: 0 }));
  return {
    deck: deck.slice(3),
    crossroads: deck.slice(0, 3),
    players,
    current: 0,
    phase: 'draw-deck',
    infection: null,
    discard: [],
    crusadePool: CRUSADE_POOL[players.length],
    crusadeLimit: CRUSADE_POOL[players.length],
    crusadeRound: 1,
    history: [{ label: 'начало', scores: players.map(score), crusade: players.map(() => 0) }],
    log: ['В городе пахнет дымом, навозом и возможностью.'],
    ended: false,
  };
}

function score(player) {
  const peasants = player.city.filter((card) => card.id === 'peasant').length;
  const monks = player.city.filter((card) => card.id === 'monk').length;
  const traders = player.city.filter((card) => card.id === 'merchant').length;
  const negativeResidents = player.city.filter((card) => card.vp < 0).length;
  return player.city.reduce((total, card) => total + card.vp
    + (card.id === 'peasant' ? peasants - 1 : 0)
    - (card.id === 'monk' ? (monks - 1) * 2 : 0)
    - (card.id === 'hermit' ? player.city.length - 1 : 0)
    + (card.id === 'devil' ? negativeResidents * 2 : 0)
    - (card.id === 'merchant' && traders > 1 ? card.vp : 0), 0) + player.relics * RELIC_VP;
}

const WOMEN = new Set(['lady', 'harlot', 'devka', 'witch']);

function recordHistory(game, label) {
  game.history.push({ label, scores: game.players.map(score), crusade: game.players.map((player) => player.crusade) });
}

function Card({ card, small = false, onClick, selected, faceDown = false }) {
  if (faceDown) return <button className={`card back ${small ? 'small' : ''}`} onClick={onClick} aria-label="Взять карту" />;
  return <button className={`card ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${card.epidemic ? 'epidemic' : ''}`} onClick={onClick} title={`${card.title}: ${card.effect}`}>
    <img src={card.art} alt={card.title} />
  </button>;
}

function City({ player, active, selectedCard, onPlace, infection }) {
  const estates = ['дворяне', 'священники', 'простолюдины'];
  return <section className={`city ${active ? 'active' : ''}`}>
    <button className="city-head" onClick={onPlace} disabled={!selectedCard}>
      <span>{player.name}</span><b>{score(player)} ПО</b><i>{player.crusade} ✠</i>
    </button>
    {player.relics > 0 && <div className="relics">{Array.from({ length: player.relics }, (_, index) => <div className="relic-card" key={index} title={`Реликвия: +${RELIC_VP} победных очков`}><span>✠</span><b>Реликвия</b><i>+{RELIC_VP} ПО</i></div>)}</div>}
    {infection?.host === player.id && <div className="infection"><span>☠</span><strong>{infection.card.title}</strong><em>{infection.power} жертв.</em></div>}
    <div className="lanes">
      {estates.map((estate) => <div className="lane" key={estate}>
        <label>{estate}</label>
        <div className="residents">{player.city.filter((card) => card.estate === estate).map((card) => <Card card={card} small key={card.uid} />)}</div>
      </div>)}
    </div>
  </section>;
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
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugStatus, setBugStatus] = useState('');

  const current = game?.players[game.current];
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
    const needsDiscardForOwnCity = ['lord', 'knight'].includes(selected.id) && targetId === game.current;
    if (needsDiscardForOwnCity && current.hand.filter((card) => card.uid !== selected.uid).length === 0) {
      say(`«${selected.title}» вторым можно поселить только в чужой город.`);
      return;
    }
    update((next) => play(next, next.current, selected, targetId));
    setSelected(null);
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

  function resolveEpidemic(next) {
    const infection = next.infection;
    if (!infection || infection.host !== next.current) return;
    const city = next.players[infection.host];
    const protectedIds = new Set(['leper', 'cat']);
    const candidates = city.city.filter((card) => !protectedIds.has(card.id));
    const clergyFirst = infection.card.id === 'leprosy';
    candidates.sort((a, b) => (clergyFirst && a.estate === 'священники' ? -1 : 0) - (clergyFirst && b.estate === 'священники' ? -1 : 0) || a.immunity - b.immunity);
    const victims = candidates.slice(0, infection.power);
    victims.forEach((victim) => {
      city.city.splice(city.city.findIndex((card) => card.uid === victim.uid), 1);
      next.discard.push(victim);
    });
    if (!city.city.length || !victims.length) {
      next.log.unshift(`${infection.card.title} погасла в городе ${city.name}.`);
      next.discard.push(infection.card);
      next.infection = null;
      return;
    }
    next.log.unshift(`${infection.card.title}: ${victims.map((card) => card.title).join(', ')} покидают город ${city.name}.`);
    next.infection = { ...infection, host: (infection.host + 1) % next.players.length, power: infection.host === infection.origin ? infection.power + 1 : infection.power };
  }

  function endTurn(next) {
    resolveEpidemic(next);
    if (next.players.some((player) => player.city.length >= 10)) {
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
      return { player, pilgrims: player.city.filter((card) => card.crusade > 0 && !(card.id === 'templar' && cityHasWomanOrAdaptable)) };
    });
    departures.forEach(({ player, pilgrims }) => {
      if (!pilgrims.length) return;
      const standardBearers = pilgrims.filter((card) => card.id === 'standard_bearer');
      const points = pilgrims.reduce((total, card) => total + card.crusade, 0) + standardBearers.length * Math.max(0, pilgrims.length - 1);
      player.city = player.city.filter((card) => !pilgrims.includes(card));
      pilgrims.forEach((card) => {
        if (card.id === 'deserter') {
          const destination = next.players[(player.id + 1) % next.players.length];
          destination.city.push(card);
          next.log.unshift(`✦ Дезертир вместо сброса появляется в городе ${destination.name}.`);
        } else next.discard.push(card);
      });
      if (next.crusadeRound <= 3) {
        player.crusade += points;
        sent += points;
      }
    });
    if (next.crusadeRound <= 3) next.crusadePool = Math.max(0, next.crusadePool - sent);
    next.log.unshift(`${next.players[ownerId].name} созывает ${local ? 'местный' : 'общий'} Крестовый поход: Святая Земля теряет ${sent} очк.`);
    if (next.crusadeRound <= 3 && next.crusadePool === 0) {
      const winner = [...next.players].sort((a, b) => b.crusade - a.crusade || a.relics - b.relics || b.city.filter((card) => card.estate === 'священники').length - a.city.filter((card) => card.estate === 'священники').length || score(a) - score(b))[0];
      winner.relics += 1;
      next.log.unshift(`${winner.name} получает Реликвию: +${RELIC_VP} ПО в конце игры.`);
      next.players.forEach((player) => { player.crusade = 0; });
      next.crusadeRound += 1;
      next.crusadePool = next.crusadeRound <= 3 ? next.crusadeLimit : 0;
    }
  }

  function discardResident(next, player, resident, reason) {
    player.city = player.city.filter((item) => item.uid !== resident.uid);
    next.discard.push(resident);
    next.log.unshift(`${reason}: «${resident.title}» отправляется в сброс.`);
  }

  function strongestResident(player, exceptUid) {
    return player.city.filter((resident) => resident.uid !== exceptUid).sort((a, b) => b.vp - a.vp || b.immunity - a.immunity)[0];
  }

  // Effects that do not need a human choice resolve immediately, and every one
  // writes a Chronicle entry so it is obvious that the card actually fired.
  function resolveEntryAbility(next, ownerId, targetId, card) {
    const target = next.players[targetId];
    const owner = next.players[ownerId];
    const activate = (text) => next.log.unshift(`✦ ${card.title}: ${text}`);
    const mutilator = target.city.find((resident) => resident.id === 'mutilator' && resident.uid !== card.uid);
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
      if (next.infection?.host === targetId) {
        next.discard.push(next.infection.card); next.infection = null;
        activate(`лечит эпидемию в городе ${target.name}.`);
      } else activate(`в городе ${target.name} нет эпидемии — лечение не требуется.`);
    } else if (card.id === 'inquisitor') {
      const botBurden = owner.bot && owner.city.filter((resident) => resident.uid !== card.uid && resident.vp < 0).sort((a, b) => a.vp - b.vp)[0];
      const victim = botBurden ?? strongestResident(target, card.uid);
      const victimCity = botBurden ? owner : target;
      if (victim) discardResident(next, victimCity, victim, `✦ Инквизитор ${owner.name} казнит жителя`);
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
      const victim = next.crossroads.sort((a, b) => b.vp - a.vp)[0];
      if (victim) { next.crossroads = next.crossroads.filter((item) => item.uid !== victim.uid); next.discard.push(victim); refillCrossroads(next); activate(`сбрасывает «${victim.title}» с Перекрёстка.`); }
      else activate('не находит персонажей на Перекрёстке.');
    } else if (card.id === 'bandit') {
      const enemy = next.players.filter((player) => player.id !== targetId).sort((a, b) => score(b) - score(a))[0];
      const victim = enemy?.city.filter((resident) => resident.estate === 'дворяне').sort((a, b) => b.vp - a.vp)[0];
      if (victim) discardResident(next, enemy, victim, `✦ Разбойник убивает дворянина в городе ${enemy.name}`);
      else activate('не находит дворянина в другом городе.');
    } else if (card.id === 'executioner') {
      const victim = target.city.filter((resident) => resident.uid !== card.uid && resident.estate === 'дворяне').sort((a, b) => b.vp - a.vp)[0];
      if (victim) discardResident(next, target, victim, '✦ Палач казнит дворянина');
      else activate('не находит дворянина в этом городе.');
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
      next.infection = { card, host: targetId, origin: targetId, power: syphilisBoost ? 2 : card.victims };
      next.log.unshift(`${owner.name} приносит «${card.title}» в город ${target.name}.`);
      if (syphilisBoost) next.log.unshift('✦ Сифилис начинает с двух жертв: в исходном городе есть Девка или Распутная девка.');
    } else {
      target.city.push(card);
      next.log.unshift(`${owner.name} селит «${card.title}» в городе ${target.name}.`);
      resolveEntryAbility(next, ownerId, targetId, card);
    }
    if (!owner.hand.length) endTurn(next);
  }

  useEffect(() => {
    if (!game || !current?.bot || game.ended) return undefined;
    const timer = setTimeout(() => update((next) => {
      const bot = next.players[next.current];
      if (next.phase === 'draw-deck') {
        const card = next.deck.shift(); if (!card) return finish(next);
        bot.hand.push(card); next.phase = 'draw-crossroads';
      } else if (next.phase === 'draw-crossroads') {
        const index = Math.floor(Math.random() * next.crossroads.length);
        const card = next.crossroads.splice(index, 1)[0]; bot.hand.push(card);
        refillCrossroads(next);
        next.phase = 'play';
      } else if (next.phase === 'play') {
        const card = bot.hand[0];
        const weakest = [...next.players].sort((a, b) => score(a) - score(b))[0];
        const leaderWithoutPlague = [...next.players].filter((player) => player.id !== bot.id && next.infection?.host !== player.id).sort((a, b) => score(b) - score(a))[0];
        const isSecondSelfPlay = ['lord', 'knight'].includes(card.id) && bot.hand.filter((item) => item.uid !== card.uid).length === 0;
        const targetId = card.id === 'plague_doc'
          ? (bot.city.some((resident) => resident.id === 'devil') ? bot.id : (leaderWithoutPlague?.id ?? weakest.id))
          : isSecondSelfPlay ? weakest.id : card.epidemic ? weakest.id : (card.vp < 0 ? weakest.id : bot.id);
        play(next, bot.id, card, targetId);
      }
    }), 700);
    return () => clearTimeout(timer);
  }, [game, current?.bot, current?.id]);

  if (!game) return <main className="welcome"><div className="welcome-card"><p className="eyebrow">A tabletop game, rebuilt from the ashes</p><p className="lede">Средневековое градостроительство, если бы человеческая жизнь стоила примерно пол-карты.</p><div className="bot-picker"><span>Соперники</span>{[1, 2, 3, 4, 5].map((count) => <button key={count} className={botCount === count ? 'picked' : ''} onClick={() => setBotCount(count)}>{count}</button>)}</div><button className="start" onClick={() => setGame(freshGame(botCount))}>Основать город <span>→</span></button><p className="rules">Каждый ход: колода → перекрёсток → разыграть всё. Эпидемии ходят по городам и становятся злее, когда возвращаются домой.</p><small className="build-version">#{BUILD_VERSION}</small></div></main>;

  const winner = game.ended ? [...game.players].sort((a, b) => score(b) - score(a))[0] : null;
  return <main className="game-shell">
    <header><div className="brand"><p className="eyebrow">сезон чумы · год господень 1248</p><small className="build-version">#{BUILD_VERSION}</small><div className="header-actions"><button className="log-toggle" title="Показать/скрыть хронику" aria-label="Показать/скрыть хронику" onClick={() => setLogOpen((open) => !open)}>{logOpen ? 'Л' : 'Л'}</button><button className="report-button" title="Сообщить об ошибке" aria-label="Сообщить об ошибке" onClick={() => { setBugStatus(''); setBugOpen(true); }}><img src="/assets/report-bug.jpg" alt="" /></button></div></div><div className="crusade-meter"><span>Святая земля · поход {Math.min(game.crusadeRound, 3)}/3</span><strong>{game.crusadeRound <= 3 ? game.crusadePool : 'захвачена'} {game.crusadeRound <= 3 && <small>/ {game.crusadeLimit}</small>}</strong><i style={{ width: `${game.crusadeRound <= 3 ? (game.crusadePool / game.crusadeLimit) * 100 : 0}%` }} /></div></header>
    <section className="table">
      <aside className="side-panel"><div className={`deck-zone ${game.phase === 'draw-deck' ? 'ready' : ''}`}><Card faceDown onClick={drawDeck} /><b>{game.deck.length}</b><span>колода</span><small>Возьми карту</small></div>{logOpen && <div className="chronicle"><p>Хроника <i>{game.log.length}</i></p>{game.log.map((line, index) => <small key={`${line}-${index}`}>{line}</small>)}</div>}</aside>
      <div className="board"><section className={`crossroads ${game.phase === 'draw-crossroads' ? 'ready' : ''}`}><div className="section-title"><span>Перекрёсток</span><small>выбери одну карту после колоды</small></div><div className="crossroad-cards">{game.crossroads.map((card, index) => <Card card={card} key={card.uid} onClick={() => drawCrossroads(index)} />)}</div></section><section className="cities">{game.players.map((player) => <City key={player.id} player={player} active={player.id === game.current} selectedCard={selected} onPlace={() => place(player.id)} infection={game.infection} />)}</section></div>
      <aside className="side-panel hand-panel"><div className="section-title"><span>Твоя рука</span><small>{game.players[0].hand.length} карт</small></div><div className="hand">{game.players[0].hand.map((card) => <Card card={card} key={card.uid} selected={selected?.uid === card.uid} onClick={() => game.current === 0 && game.phase === 'play' && setSelected(card)} />)}</div><p className="hint">{notice || (selected ? `«${selected.title}»: ${selected.effect} Нажми на город — мгновенный эффект будет отмечен в Хронике.` : 'Твои карты появятся здесь.')}</p></aside>
    </section>
    {winner && <div className="ending"><div><p className="eyebrow">летописец поставил точку</p><h2>{winner.name} побеждает</h2><strong>{score(winner)} победных очков</strong><div className="scoreboard">{game.players.map((player) => <span key={player.id}><b>{player.name}</b><i>{score(player)} ПО · {player.crusade} ✠ · {player.relics} реликв.</i></span>)}</div><div className="graph"><p>Победные очки по ходам</p><ScoreChart history={game.history} players={game.players} /></div><button onClick={() => setGame(freshGame(botCount))}>Ещё один год страданий</button></div></div>}
    {bugOpen && <div className="bug-modal" onClick={() => bugStatus !== 'sending' && setBugOpen(false)}><form onSubmit={(event) => { event.preventDefault(); submitBug(); }} onClick={(event) => event.stopPropagation()}><h2>Сообщить об ошибке</h2><p>К отчёту будет приложена последняя хроника партии.</p><textarea autoFocus value={bugText} onChange={(event) => setBugText(event.target.value)} placeholder="Что произошло? (необязательно)" maxLength="1200" />{bugStatus === 'sent' ? <strong className="bug-success">Отчёт отправлен. Спасибо!</strong> : bugStatus === 'failed' ? <strong className="bug-failed">Не удалось отправить отчёт.</strong> : null}<div><button type="button" onClick={() => setBugOpen(false)} disabled={bugStatus === 'sending'}>Отмена</button><button className="start" type="submit" disabled={bugStatus === 'sending'}>Отправить</button></div></form></div>}
  </main>;
}
