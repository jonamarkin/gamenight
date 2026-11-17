// Starter content. Everything here is sample material meant to be replaced
// or extended with proper packs.

export const ROOM_WORDS = [
  'KENKEY', 'WAAKYE', 'JOLLOF', 'BANKU', 'AZONTO', 'KENTE', 'TROTRO', 'SOBOLO',
  'SHITO', 'GARI', 'OWARE', 'AMPESI', 'KOKO', 'ABOLO', 'BOFROT', 'FUFU',
];

export const SCRAMBLE_WORDS: { w: string; clue: string }[] = [
  { w: 'TROTRO', clue: 'How Accra gets around' },
  { w: 'KELEWELE', clue: 'Spicy fried plantain' },
  { w: 'AZONTO', clue: 'The dance that took over' },
  { w: 'JOLLOF', clue: 'The rice worth arguing about' },
  { w: 'KENTE', clue: 'Woven with meaning' },
  { w: 'HARMATTAN', clue: 'Dry, dusty season' },
  { w: 'WAAKYE', clue: 'Rice and beans, wrapped in a leaf' },
  { w: 'HIGHLIFE', clue: 'Guitar-driven music born in Ghana' },
  { w: 'ADINKRA', clue: 'Symbols with sayings behind them' },
  { w: 'CEDI', clue: 'What you pay with in Ghana' },
  { w: 'KUMASI', clue: 'The Garden City' },
  { w: 'PLANTAIN', clue: 'Fry it, boil it or roast it' },
  { w: 'COCOA', clue: 'Chocolate starts here' },
  { w: 'OWARE', clue: 'Seeds, pits and strategy' },
  { w: 'CHALE', clue: 'What you call your friend' },
  { w: 'FUFU', clue: 'Pounded and swallowed, never chewed' },
  { w: 'KENKEY', clue: 'Fermented corn, best with fish' },
  { w: 'TAMALE', clue: 'Capital of the Northern Region' },
  { w: 'SOBOLO', clue: 'Deep red hibiscus drink' },
  { w: 'GROUNDNUT', clue: 'The soup that goes with rice balls' },
];

export const TRIVIA: { cat: string; q: string; a: string[]; ok: number }[] = [
  { cat: 'Ghana', q: 'Which city is the capital of the Ashanti Region?', a: ['Tamale', 'Kumasi', 'Cape Coast', 'Ho'], ok: 1 },
  { cat: 'History', q: 'In which year did Ghana gain independence?', a: ['1947', '1957', '1960', '1966'], ok: 1 },
  { cat: 'Africa', q: 'Which African country has the largest population?', a: ['Ethiopia', 'Egypt', 'Nigeria', 'DR Congo'], ok: 2 },
  { cat: 'Geography', q: 'Which lake in Ghana is one of the largest man-made lakes in the world?', a: ['Lake Bosomtwe', 'Lake Volta', 'Lake Victoria', 'Lake Chad'], ok: 1 },
  { cat: 'Sport', q: 'The Black Stars represent Ghana in which sport?', a: ['Boxing', 'Athletics', 'Basketball', 'Football'], ok: 3 },
  { cat: 'History', q: 'Who was the first President of Ghana?', a: ['Kofi Annan', 'Jerry Rawlings', 'Kwame Nkrumah', 'John Kufuor'], ok: 2 },
  { cat: 'Geography', q: 'What is the capital city of Kenya?', a: ['Mombasa', 'Nairobi', 'Kampala', 'Kisumu'], ok: 1 },
  { cat: 'Africa', q: 'What is the highest mountain in Africa?', a: ['Mount Kenya', 'Mount Cameroon', 'Mount Kilimanjaro', 'Mount Afadja'], ok: 2 },
  { cat: 'Ghana', q: 'What was Ghana called before independence?', a: ['Gold Coast', 'Ivory Coast', 'Slave Coast', 'Grain Coast'], ok: 0 },
  { cat: 'Ghana', q: 'How many stars are on the flag of Ghana?', a: ['None', 'One', 'Two', 'Three'], ok: 1 },
  { cat: 'Geography', q: 'Which is the longest river in Africa?', a: ['Congo', 'Niger', 'Zambezi', 'Nile'], ok: 3 },
  { cat: 'Geography', q: 'Which ocean lies off the coast of Ghana?', a: ['Indian', 'Pacific', 'Atlantic', 'Arctic'], ok: 2 },
  { cat: 'Africa', q: 'Which country is home to the pyramids of Giza?', a: ['Sudan', 'Egypt', 'Libya', 'Morocco'], ok: 1 },
  { cat: 'Sport', q: 'How many players does a football team have on the pitch?', a: ['Nine', 'Ten', 'Eleven', 'Twelve'], ok: 2 },
  { cat: 'Ghana', q: 'Which Ghanaian served as Secretary-General of the United Nations?', a: ['Kofi Annan', 'Kwame Nkrumah', 'J. B. Danquah', 'Kofi Busia'], ok: 0 },
];

/** Word-to-word puzzles. `path` is one known solution, shown at the reveal. */
export const LADDERS: { from: string; to: string; path: string[] }[] = [
  { from: 'cat', to: 'dog', path: ['cat', 'cot', 'dot', 'dog'] },
  { from: 'cold', to: 'warm', path: ['cold', 'cord', 'card', 'ward', 'warm'] },
  { from: 'love', to: 'hate', path: ['love', 'hove', 'have', 'hate'] },
  { from: 'sick', to: 'well', path: ['sick', 'silk', 'sill', 'sell', 'well'] },
  { from: 'east', to: 'west', path: ['east', 'vast', 'vest', 'west'] },
  { from: 'give', to: 'take', path: ['give', 'gave', 'cave', 'cake', 'take'] },
  { from: 'head', to: 'tail', path: ['head', 'heal', 'teal', 'tell', 'tall', 'tail'] },
  { from: 'hand', to: 'foot', path: ['hand', 'band', 'bond', 'fond', 'font', 'foot'] },
  { from: 'boat', to: 'ship', path: ['boat', 'coat', 'chat', 'chap', 'chip', 'ship'] },
  { from: 'hard', to: 'easy', path: ['hard', 'card', 'cart', 'cast', 'east', 'easy'] },
  { from: 'poor', to: 'rich', path: ['poor', 'boor', 'book', 'rook', 'rock', 'rick', 'rich'] },
  { from: 'man', to: 'ape', path: ['man', 'mat', 'oat', 'opt', 'apt', 'ape'] },
];

export const NPAT_LETTERS = 'ABCDEFGHJKLMNOPRSTW'.split('');

export const ACT_PROMPTS = [
  'Pounding fufu', 'Squeezing into a trotro', 'Dancing azonto', 'Frying kelewele',
  'Bargaining at the market', 'Scoring a last-minute goal', 'Fetching water',
  'Chasing a goat', 'Light off in the middle of a film', 'Eating hot pepper',
  'Riding an okada', 'Selling pure water in traffic', 'Braiding hair',
  'A trotro mate calling passengers', 'Sweeping the compound', 'Late for church',
  'Taking a selfie', 'Carrying a baby on your back', 'Playing oware', 'Ironing a shirt',
  'Fishing from a canoe', 'Killing a mosquito', 'Roasting plantain', 'Washing clothes by hand',
];
