import React, { useEffect, useState } from 'react';
import { buildDeck, shuffle } from './cards.js';

const NAMES = ['Конста', 'Гертруда', 'Ульрих', 'Ингеборга', 'Тибальт', 'Матильда'];
const BOT_NAMES = ['Гертруда', 'Ульрих', 'Ингеборга', 'Тибальт', 'Матильда'];
const CRUSADE_POOL = { 2: 16, 3: 16, 4: 20, 5: 23, 6: 25 };

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
  return player.city.reduce((total, card) => total + card.vp + (card.id === 'peasant' ? peasants - 1 : 0) - (card.id === 'monk' ? (monks - 1) * 2 : 0), 0) + player.relics * 4;
}

function recordHistory(game, label) {
  game.history.push({ label, scores: game.players.map(score), crusade: game.players.map((player) => player.crusade) });
}

function Card({ card, small = false, onClick, selected, faceDown = false }) {
  if (faceDown) return <button className={`card back ${small ? 'small' : ''}`} onClick={onClick} aria-label="Взять карту" />;
  return <button className={`card ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${card.epidemic ? 'epidemic' : ''}`} onClick={onClick} title={`${card.title}: ${card.effect}`}>
    <img src={card.art} alt={card.title} />
    <span className="card-caption">{card.title}</span>
  </button>;
}

function City({ player, active, selectedCard, onPlace, infection }) {
  const estates = ['дворяне', 'священники', 'простолюдины'];
  return <section className={`city ${active ? 'active' : ''}`}>
    <button className="city-head" onClick={onPlace} disabled={!selectedCard}>
      <span>{player.name}</span><b>{score(player)} ПО</b><i>{player.crusade} ✠</i>
    </button>
    {infection?.host === player.id && <div className="infection"><span>☠</span><strong>{infection.card.title}</strong><em>{infection.power} жертв.</em></div>}
    <div className="lanes">
      {estates.map((estate) => <div className="lane" key={estate}>
        <label>{estate}</label>
        <div className="residents">{player.city.filter((card) => card.estate === estate).map((card) => <Card card={card} small key={card.uid} />)}</div>
      </div>)}
    </div>
  </section>;
}

export default function App() {
  const [botCount, setBotCount] = useState(3);
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');

  const current = game?.players[game.current];
  const update = (mutate) => setGame((previous) => {
    const next = structuredClone(previous);
    mutate(next);
    return next;
  });
  const say = (text) => setNotice(text);

  function drawDeck() {
    if (game.phase !== 'draw-deck' || current.bot) return;
    update((next) => {
      const card = next.deck.shift();
      if (!card) return finish(next);
      next.players[next.current].hand.push(card);
      next.phase = 'draw-crossroads';
      next.log.unshift(`${current.name} берёт карту из колоды.`);
    });
    say('Теперь выбери одну карту с перекрёстка.');
  }

  function drawCrossroads(index) {
    if (game.phase !== 'draw-crossroads' || current.bot) return;
    update((next) => {
      const card = next.crossroads.splice(index, 1)[0];
      next.players[next.current].hand.push(card);
      const replacement = next.deck.shift();
      if (replacement) next.crossroads.push(replacement);
      next.phase = 'play';
      next.log.unshift(`${current.name} забирает «${card.title}» с перекрёстка.`);
    });
    say('Разыграй обе карты. В свой город или в чужой.');
  }

  function place(targetId) {
    if (!selected || game.phase !== 'play' || current.bot) return;
    update((next) => play(next, next.current, selected, targetId));
    setSelected(null);
  }

  function finish(next) {
    recordHistory(next, 'конец');
    next.ended = true;
    next.phase = 'ended';
    next.log.unshift('Колода иссякла. Пора считать тех, кто ещё дышит.');
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

  function triggerCrusade(next, ownerId) {
    let sent = 0;
    next.players.forEach((player) => {
      const pilgrims = player.city.filter((card) => card.crusade > 0);
      if (!pilgrims.length) return;
      const points = pilgrims.reduce((total, card) => total + card.crusade, 0);
      player.city = player.city.filter((card) => !pilgrims.includes(card));
      if (next.crusadeRound <= 3) {
        player.crusade += points;
        sent += points;
      }
    });
    if (next.crusadeRound <= 3) next.crusadePool = Math.max(0, next.crusadePool - sent);
    next.log.unshift(`${next.players[ownerId].name} созывает Крестовый поход: Святая Земля теряет ${sent} очк.`);
    if (next.crusadeRound <= 3 && next.crusadePool === 0) {
      const winner = [...next.players].sort((a, b) => b.crusade - a.crusade || a.relics - b.relics || b.city.filter((card) => card.estate === 'священники').length - a.city.filter((card) => card.estate === 'священники').length || score(a) - score(b))[0];
      winner.relics += 1;
      next.log.unshift(`${winner.name} получает Реликвию за ${winner.crusade} очков Похода.`);
      next.crusadeRound += 1;
      next.crusadePool = next.crusadeRound <= 3 ? next.crusadeLimit : 0;
    }
  }

  function play(next, ownerId, card, targetId) {
    const owner = next.players[ownerId];
    const target = next.players[targetId];
    const handIndex = owner.hand.findIndex((item) => item.uid === card.uid);
    if (handIndex < 0) return;
    owner.hand.splice(handIndex, 1);
    if (card.epidemic) {
      next.infection = { card, host: targetId, origin: targetId, power: card.victims };
      next.log.unshift(`${owner.name} приносит «${card.title}» в город ${target.name}.`);
    } else {
      target.city.push(card);
      next.log.unshift(`${owner.name} селит «${card.title}» в городе ${target.name}.`);
      if (card.id === 'plague_doc' && next.infection?.host === targetId) {
        next.discard.push(next.infection.card); next.infection = null;
        next.log.unshift('Чумной доктор победил болезнь. На этот раз.');
      }
      if (card.id === 'inquisitor' && target.city.length > 1) {
        const victim = target.city.filter((resident) => resident.uid !== card.uid).sort((a, b) => a.immunity - b.immunity)[0];
        target.city.splice(target.city.findIndex((resident) => resident.uid === victim.uid), 1); next.discard.push(victim);
        next.log.unshift(`Инквизитор сжёг «${victim.title}».`);
      }
      if (card.id === 'episcop' || card.id === 'preacher') triggerCrusade(next, targetId);
    }
    if (!owner.hand.length) endTurn(next);
  }

  useEffect(() => {
    if (!game || !current?.bot || game.ended) return undefined;
    const timer = setTimeout(() => update((next) => {
      const bot = next.players[next.current];
      if (next.phase === 'draw-deck') {
        const card = next.deck.shift(); if (!card) return finish(next);
        bot.hand.push(card); next.phase = 'draw-crossroads'; next.log.unshift(`${bot.name} берёт карту из колоды.`);
      } else if (next.phase === 'draw-crossroads') {
        const index = Math.floor(Math.random() * next.crossroads.length);
        const card = next.crossroads.splice(index, 1)[0]; bot.hand.push(card);
        const replacement = next.deck.shift(); if (replacement) next.crossroads.push(replacement);
        next.phase = 'play'; next.log.unshift(`${bot.name} берёт карту с перекрёстка.`);
      } else if (next.phase === 'play') {
        const card = bot.hand[0];
        const weakest = [...next.players].sort((a, b) => score(a) - score(b))[0];
        const targetId = card.epidemic ? weakest.id : (card.vp < 0 ? weakest.id : bot.id);
        play(next, bot.id, card, targetId);
      }
    }), 700);
    return () => clearTimeout(timer);
  }, [game, current?.bot, current?.id]);

  if (!game) return <main className="welcome"><div className="welcome-card"><p className="eyebrow">A tabletop game, rebuilt from the ashes</p><h1>Страдания</h1><p className="lede">Средневековое градостроительство, если бы человеческая жизнь стоила примерно пол-карты.</p><div className="bot-picker"><span>Соперники</span>{[1, 2, 3, 4, 5].map((count) => <button key={count} className={botCount === count ? 'picked' : ''} onClick={() => setBotCount(count)}>{count}</button>)}</div><button className="start" onClick={() => setGame(freshGame(botCount))}>Основать город <span>→</span></button><p className="rules">Каждый ход: колода → перекрёсток → разыграть всё. Эпидемии ходят по городам и становятся злее, когда возвращаются домой.</p></div></main>;

  const winner = game.ended ? [...game.players].sort((a, b) => score(b) - score(a))[0] : null;
  return <main className="game-shell">
    <header><div><p className="eyebrow">сезон чумы · год господень 1248</p><h1>Страдания</h1></div><div className="turn"><span>Ход</span><strong>{current.name}</strong><small>{game.phase === 'draw-deck' ? 'взять из колоды' : game.phase === 'draw-crossroads' ? 'выбрать перекрёсток' : game.phase === 'play' ? 'разыграть карты' : 'конец'}</small></div><div className="crusade-meter"><span>Святая земля · поход {Math.min(game.crusadeRound, 3)}/3</span><strong>{game.crusadeRound <= 3 ? game.crusadePool : 'захвачена'} {game.crusadeRound <= 3 && <small>/ {game.crusadeLimit}</small>}</strong><i style={{ width: `${game.crusadeRound <= 3 ? (game.crusadePool / game.crusadeLimit) * 100 : 0}%` }} /></div><button className="restart" onClick={() => setGame(null)}>Новая партия</button></header>
    <section className="table">
      <aside className="side-panel"><div className="deck-zone"><Card faceDown onClick={drawDeck} /><b>{game.deck.length}</b><span>колода</span></div><div className="chronicle"><p>Хроника</p>{game.log.slice(0, 6).map((line, index) => <small key={`${line}-${index}`}>{line}</small>)}</div></aside>
      <div className="board"><section className="crossroads"><div className="section-title"><span>Перекрёсток</span><small>выбери одну карту после колоды</small></div><div className="crossroad-cards">{game.crossroads.map((card, index) => <Card card={card} key={card.uid} onClick={() => drawCrossroads(index)} />)}</div></section><section className="cities">{game.players.map((player) => <City key={player.id} player={player} active={player.id === game.current} selectedCard={selected} onPlace={() => place(player.id)} infection={game.infection} />)}</section></div>
      <aside className="side-panel hand-panel"><div className="section-title"><span>Твоя рука</span><small>{game.players[0].hand.length} карт</small></div><div className="hand">{game.players[0].hand.map((card) => <Card card={card} key={card.uid} selected={selected?.uid === card.uid} onClick={() => game.current === 0 && game.phase === 'play' && setSelected(card)} />)}</div><p className="hint">{notice || (selected ? `«${selected.title}» выбрана. Нажми на город.` : 'Твои карты появятся здесь.')}</p></aside>
    </section>
    {winner && <div className="ending"><div><p className="eyebrow">летописец поставил точку</p><h2>{winner.name} побеждает</h2><strong>{score(winner)} победных очков</strong><div className="scoreboard">{game.players.map((player) => <span key={player.id}><b>{player.name}</b><i>{score(player)} ПО · {player.crusade} ✠ · {player.relics} реликв.</i></span>)}</div><div className="graph"><p>Ход партии</p><div className="graph-bars">{game.players.map((player, playerIndex) => <div className="series" key={player.id}><b>{player.name}</b><div>{game.history.map((entry, index) => <i key={index} title={`${entry.label}: ${entry.scores[playerIndex]} ПО`} style={{ height: `${Math.max(8, Math.min(100, entry.scores[playerIndex] * 10 + 12))}%` }} />)}</div></div>)}</div><small>Высота столбика: победные очки после каждого хода.</small></div><button onClick={() => setGame(freshGame(botCount))}>Ещё один год страданий</button></div></div>}
  </main>;
}
