const resident = (id, title, estate, immunity, vp, copies, effect = '', crusade = 0, artId = id) => ({ id, title, estate, immunity, vp, copies, effect, crusade, epidemic: false, art: `/assets/cards/${artId}.webp` });
const disease = (id, title, victims, effect = '') => ({ id, title, victims, copies: 1, effect, epidemic: true, art: `/assets/cards/${id}.webp` });

export const CARD_LIBRARY = [
  resident('peasant', 'Крестьянин', 'простолюдины', 6, 2, 7, '+1 ПО за каждого другого Крестьянина в городе'),
  resident('knight', 'Рыцарь', 'дворяне', 57, 3, 3, 'Крестоносец', 3),
  resident('lord', 'Лорд', 'дворяне', 29, 6, 2, 'Крестоносец', 3),
  resident('lady', 'Леди', 'дворяне', 5, 1, 2, 'Отправляет Рыцаря соседнего города в Поход'),
  resident('warhorse', 'Боевой конь', 'дворяне', 33, 2, 2, 'Крестоносец', 6),
  resident('weapon_bearer', 'Оруженосец', 'дворяне', 67, 2, 2, 'Может принять смерть вместо Рыцаря', 3),
  resident('monk', 'Монах', 'священники', 25, 3, 4, 'Теряет 2 ПО за каждого другого Монаха'),
  resident('episcop', 'Епископ', 'священники', 35, 2, 1, 'Созывает Крестовый поход'),
  resident('preacher', 'Проповедник', 'священники', 19, 1, 1, 'Созывает Крестовый поход'),
  resident('inquisitor', 'Инквизитор', 'священники', 41, 2, 1, 'Сжигает жителя в любом городе'),
  resident('plague_doc', 'Чумной доктор', 'священники', 52, 1, 5, 'Лечит эпидемию в этом городе'),
  resident('witch', 'Ведьма', 'простолюдины', 99, -4, 2, 'Правитель города получает 2 карты'),
  resident('executioner', 'Палач', 'простолюдины', 61, -2, 2, 'Казнит придворного, затем манит простолюдинов'),
  resident('troubadur', 'Менестрель', 'простолюдины', 45, 1, 1, 'Крадёт до 3 очков Похода'),
  resident('merchant', 'Купец', 'простолюдины', 53, 3, 2, 'Не приносит ПО при второй Торговке', 0, 'merchant'),
  resident('recruit', 'Рекрутёр', 'простолюдины', 31, 2, 2, 'Отправляет мирных жителей в Поход'),
  resident('guard', 'Стражник', 'простолюдины', 39, 3, 2, 'Защищает порядок'),
  resident('jester', 'Шут', 'простолюдины', 87, 2, 1, 'Копирует свойство с перекрёстка'),
  resident('innkeeper', 'Трактирщик', 'простолюдины', 57, 2, 2, 'Селит верхнюю карту колоды'),
  resident('harlot', 'Распутная девка', 'простолюдины', 69, 1, 2, 'Очень спорный гражданин', 0, 'whore'),
  resident('leper', 'Прокажённый', 'простолюдины', 0, 1, 1, 'Не умирает от эпидемий'),
  resident('heretic-science', 'Еретик-натуралист', 'простолюдины', 7, 4, 1, 'Переселяет жителя в другой город'),
  resident('heretic-necro', 'Еретик-некромант', 'простолюдины', 7, 4, 1, 'Возвращает жителя из сброса'),
  resident('heretic-alch', 'Еретик-алхимик', 'простолюдины', 7, 4, 1, 'Уничтожает жителя ради Поход'),
  disease('cholera', 'Холера', 2, 'Убивает самых незащищённых'),
  disease('leprosy', 'Лепра', 1, 'Сначала забирает священников'),
  disease('malaria', 'Малярия', 2, 'Убивает самых незащищённых'),
  disease('black_pox', 'Чёрная оспа', 3, 'Убивает самых незащищённых'),
  disease('bubonic_plague', 'Бубонная чума', 3, 'Убивает самых незащищённых'),
];

export function buildDeck() {
  return CARD_LIBRARY.flatMap((card) => Array.from({ length: card.copies }, (_, index) => ({ ...card, uid: `${card.id}-${index}-${Math.random().toString(36).slice(2)}` })));
}

export function shuffle(cards) {
  return [...cards].sort(() => Math.random() - 0.5);
}
