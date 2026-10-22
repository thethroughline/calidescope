(function () {
  var DOW = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  var DOWL = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
  function dow(d) { return DOW[(d - 1) % 7]; }
  function lab(d) { return dow(d) + ' ' + d + ' Oct'; }
  function long(d) { return DOWL[(d - 1) % 7] + ' ' + d + ' October'; }

  var WIKI = { obama: 'Barack_Obama', aretha: 'Aretha_Franklin', churchill: 'Winston_Churchill', jackie: 'Jackie_Robinson', oprah: 'Oprah_Winfrey', ali: 'Muhammad_Ali', golda: 'Golda_Meir', yoyoma: 'Yo-Yo_Ma', jfk: 'John_F._Kennedy', stevie: 'Stevie_Wonder', huffington: 'Arianna_Huffington', biles: 'Simone_Biles', michelle: 'Michelle_Obama', bjk: 'Billie_Jean_King', mlk: 'Martin_Luther_King_Jr.', nina: 'Nina_Simone', staley: 'Dawn_Staley' };
  var H = [
    ['obama', 'Barack Obama', 'Obama', 'BO', 'Leader', 'm', 'stay close', '44th US President', ['Kept rivals close', 'Calm under attack', 'Spoke to the whole room']],
    ['aretha', 'Aretha Franklin', 'Aretha Franklin', 'AF', 'Music', 'f', 'earn it daily', 'Singer, Detroit', ['Asked for respect by name', 'Ran her own career', 'Kept the standard high']],
    ['churchill', 'Winston Churchill', 'Churchill', 'WC', 'Leader', 'm', 'carry the weight', 'Wartime Prime Minister, UK', ['Told people the hard truth', 'Held the line under pressure', 'Wrote the story as he went']],
    ['jackie', 'Jackie Robinson', 'Jackie Robinson', 'JR', 'Sport', 'm', 'carry the weight', 'Ballplayer, Brooklyn Dodgers', ['Restraint as strength', 'Let the work answer', 'Spoke out when it was time']],
    ['oprah', 'Oprah Winfrey', 'Oprah', 'OW', 'Leader', 'f', 'grow them', 'Broadcaster and founder', ['Built the platform herself', 'Made the room feel heard', 'Turned trust into a business']],
    ['ali', 'Muhammad Ali', 'Ali', 'MA', 'Sport', 'm', 'out front', 'Heavyweight champion', ['Said it first, out loud', 'Took the cost of conviction', 'Made himself the story']],
    ['golda', 'Golda Meir', 'Golda Meir', 'GM', 'Leader', 'f', 'carry the weight', 'Prime Minister of Israel', ['Direct with everyone', 'Carried the hardest calls', 'Built support person by person']],
    ['yoyoma', 'Yo-Yo Ma', 'Yo-Yo Ma', 'YM', 'Music', 'm', 'grow them', 'Cellist', ['Played in service of others', 'Crossed every boundary', 'Curious first']],
    ['jfk', 'John F. Kennedy', 'Kennedy', 'JK', 'Leader', 'm', 'out front', '35th US President', ['Set the goal out loud', 'Took the blame in public', 'Gathered strong people around him']],
    ['stevie', 'Stevie Wonder', 'Stevie Wonder', 'SW', 'Music', 'm', 'earn it daily', 'Singer and songwriter, Motown', ['Owned his own work', 'Built in his own voice', 'Patient, then decisive']],
    ['huffington', 'Arianna Huffington', 'Arianna Huffington', 'AH', 'Leader', 'f', 'grow them', 'Founder, editor', ['Started again in public', 'Built from her own network', 'Changed her own rules']],
    ['biles', 'Simone Biles', 'Simone Biles', 'SB', 'Sport', 'f', 'earn it daily', 'Gymnast', ['Put her standards first', 'Said no when it mattered', 'Raised the bar for everyone']],
    ['michelle', 'Michelle Obama', 'Michelle Obama', 'MO', 'Leader', 'f', 'stay close', 'Lawyer, author, First Lady', ['Rose above the fight', 'Herself in public', 'Turned scrutiny into a platform']],
    ['bjk', 'Billie Jean King', 'Billie Jean King', 'BK', 'Sport', 'f', 'carry the weight', 'Tennis champion, founder of the WTA', ['Took the match that mattered', 'Built the institution', 'Made it about everyone']],
    ['mlk', 'Martin Luther King Jr.', 'Dr King', 'MK', 'Leader', 'm', 'carry the weight', 'Civil rights leader', ['Named the problem plainly', 'Held a coalition together', 'Chose the moment']],
    ['nina', 'Nina Simone', 'Nina Simone', 'NS', 'Music', 'f', 'out front', 'Singer, pianist, activist', ['Said it in her own words', 'Refused to soften the work', 'Paid the price for it']],
    ['staley', 'Dawn Staley', 'Dawn Staley', 'DS', 'Sport', 'f', 'grow them', 'Basketball coach, South Carolina', ['Coached the way she played', 'Spoke up for her players', 'Built a program from the ground']]
  ];
  var hero = {};
  var heroes = H.map(function (r) {
    var h = { id: r[0], name: r[1], short: r[2], ini: r[3], area: r[4], sex: r[5], stance: r[6], desc: r[7], q: r[8], canon: r[4] === 'Leader', wiki: WIKI[r[0]] };
    hero[h.id] = h; return h;
  });
  // Salience fields for the original seventeen: defining year, admired across generations
  var YR = { obama: [2008, 1], michelle: [2009, 1], mlk: [1963, 1], jfk: [1961, 1], ali: [1964, 1], stevie: [1971, 1], oprah: [1986, 0], churchill: [1940, 0], golda: [1969, 0], aretha: [1967, 0], biles: [2016, 0], bjk: [1973, 0], jackie: [1947, 0], yoyoma: [1998, 0], huffington: [2005, 0], nina: [1964, 0], staley: [2017, 0] };
  heroes.forEach(function (h) { var y = YR[h.id] || [0, 0]; h.year = y[0]; h.salient = 0; h.cross = !!y[1]; });
  // The pools (rebrief §5). [id, name, short, initials, descriptor, year, salient year, sex, cross, area, wiki]
  var P2 = [
    ['mandela', 'Nelson Mandela', 'Mandela', 'NM', 'President of South Africa', 1990, 0, 'm', 0, 'Leader'],
    ['jobs', 'Steve Jobs', 'Jobs', 'SJ', 'Co-founder, Apple', 1984, 0, 'm', 0, 'Leader'],
    ['rbg', 'Ruth Bader Ginsburg', 'Ginsburg', 'RG', 'Supreme Court Justice', 1993, 0, 'f', 0, 'Leader'],
    ['carter', 'Jimmy Carter', 'Carter', 'JC', '39th US President', 1978, 0, 'm', 0, 'Leader'],
    ['ride', 'Sally Ride', 'Sally Ride', 'SR', 'Astronaut, physicist', 1983, 0, 'f', 0, 'Leader'],
    ['malala', 'Malala Yousafzai', 'Malala', 'MY', 'Education activist, Nobel laureate', 2014, 0, 'f', 0, 'Leader'],
    ['ardern', 'Jacinda Ardern', 'Ardern', 'JA', 'Former Prime Minister of New Zealand', 2017, 0, 'f', 0, 'Leader'],
    ['saujani', 'Reshma Saujani', 'Saujani', 'RS', 'Founder, Girls Who Code', 2012, 0, 'f', 0, 'Leader'],
    ['nadella', 'Satya Nadella', 'Nadella', 'SN', 'CEO, Microsoft', 2014, 0, 'm', 0, 'Leader'],
    ['kjohnson', 'Katherine Johnson', 'Katherine Johnson', 'KJ', 'NASA mathematician', 1962, 2016, 'f', 0, 'Leader'],
    ['nooyi', 'Indra Nooyi', 'Nooyi', 'IN', 'Former CEO, PepsiCo', 2006, 0, 'f', 0, 'Leader'],
    ['merkel', 'Angela Merkel', 'Merkel', 'AM', 'Former Chancellor of Germany', 2005, 0, 'f', 0, 'Leader'],
    ['eleanor', 'Eleanor Roosevelt', 'Eleanor Roosevelt', 'ER', 'Diplomat, First Lady', 1948, 0, 'f', 0, 'Leader'],
    ['powell', 'Colin Powell', 'Powell', 'CP', 'General, Secretary of State', 1989, 0, 'm', 0, 'Leader'],
    ['marley', 'Bob Marley', 'Marley', 'BM', 'Singer, songwriter, label founder', 1978, 0, 'm', 0, 'Music'],
    ['prince', 'Prince', 'Prince', 'P', 'Musician, producer', 1984, 0, 'm', 0, 'Music', 'Prince_(musician)'],
    ['tina', 'Tina Turner', 'Tina Turner', 'TT', 'Singer', 1984, 0, 'f', 1, 'Music'],
    ['springsteen', 'Bruce Springsteen', 'Springsteen', 'BS', 'Singer and songwriter', 1984, 0, 'm', 0, 'Music'],
    ['beyonce', 'Beyoncé', 'Beyoncé', 'B', 'Singer, producer', 2003, 0, 'f', 0, 'Music', 'Beyoncé'],
    ['rihanna', 'Rihanna', 'Rihanna', 'R', 'Singer, founder of Fenty', 2007, 0, 'f', 0, 'Music'],
    ['swift', 'Taylor Swift', 'Taylor Swift', 'TS', 'Songwriter', 2008, 0, 'f', 0, 'Music'],
    ['badbunny', 'Bad Bunny', 'Bad Bunny', 'BB', 'Musician', 2020, 0, 'm', 0, 'Music'],
    ['dolly', 'Dolly Parton', 'Dolly Parton', 'DP', 'Singer, songwriter, founder', 1974, 0, 'f', 1, 'Music'],
    ['jordan', 'Michael Jordan', 'Jordan', 'MJ', 'Basketball player, owner', 1991, 0, 'm', 1, 'Sport'],
    ['serena', 'Serena Williams', 'Serena', 'SW', 'Tennis champion, investor', 1999, 0, 'f', 0, 'Sport'],
    ['lebron', 'LeBron James', 'LeBron', 'LJ', 'Basketball player, founder', 2016, 0, 'm', 0, 'Sport'],
    ['magic', 'Magic Johnson', 'Magic Johnson', 'EJ', 'Basketball player, businessman', 1980, 0, 'm', 0, 'Sport'],
    ['rapinoe', 'Megan Rapinoe', 'Rapinoe', 'MR', 'Footballer and advocate', 2019, 0, 'f', 0, 'Sport'],
    ['gauff', 'Coco Gauff', 'Coco Gauff', 'CG', 'Tennis champion', 2023, 0, 'f', 0, 'Sport'],
    ['clark', 'Caitlin Clark', 'Caitlin Clark', 'CC', 'Basketball player', 2024, 0, 'f', 0, 'Sport'],
    ['spielberg', 'Steven Spielberg', 'Spielberg', 'SS', 'Director', 1975, 0, 'm', 0, 'Film & TV'],
    ['zendaya', 'Zendaya', 'Zendaya', 'Z', 'Actor, producer', 2019, 0, 'f', 0, 'Film & TV'],
    ['lucille', 'Lucille Ball', 'Lucille Ball', 'LB', 'Actor, studio head', 1951, 0, 'f', 0, 'Film & TV'],
    ['spikelee', 'Spike Lee', 'Spike Lee', 'SL', 'Director', 1989, 0, 'm', 0, 'Film & TV'],
    ['shonda', 'Shonda Rhimes', 'Shonda Rhimes', 'SR', 'Producer, writer', 2005, 0, 'f', 0, 'Film & TV'],
    ['duvernay', 'Ava DuVernay', 'DuVernay', 'AD', 'Director', 2014, 0, 'f', 0, 'Film & TV'],
    ['mrbeast', 'MrBeast', 'MrBeast', 'MB', 'Creator and founder', 2018, 0, 'm', 0, 'Creators'],
    ['chamberlain', 'Emma Chamberlain', 'Emma Chamberlain', 'EC', 'Creator and founder', 2018, 0, 'f', 0, 'Creators'],
    ['mkbhd', 'Marques Brownlee', 'Brownlee', 'MK', 'Technology reviewer', 2009, 0, 'm', 0, 'Creators'],
    ['cooper', 'Alex Cooper', 'Alex Cooper', 'AC', 'Podcaster and founder', 2018, 0, 'f', 0, 'Creators'],
    ['lilly', 'Lilly Singh', 'Lilly Singh', 'LS', 'Creator, host', 2019, 0, 'f', 0, 'Creators'],
    ['neistat', 'Casey Neistat', 'Neistat', 'CN', 'Filmmaker, creator', 2015, 0, 'm', 0, 'Creators'],
    ['chanel', 'Coco Chanel', 'Chanel', 'CC', 'Designer', 1926, 0, 'f', 0, 'Fashion & design'],
    ['lauren', 'Ralph Lauren', 'Ralph Lauren', 'RL', 'Designer, founder', 1967, 0, 'm', 0, 'Fashion & design'],
    ['dvf', 'Diane von Furstenberg', 'von Furstenberg', 'DF', 'Designer', 1974, 0, 'f', 0, 'Fashion & design'],
    ['prada', 'Miuccia Prada', 'Prada', 'MP', 'Designer', 1988, 0, 'f', 0, 'Fashion & design'],
    ['ive', 'Jony Ive', 'Ive', 'JI', 'Industrial designer', 1998, 0, 'm', 0, 'Fashion & design'],
    ['abloh', 'Virgil Abloh', 'Abloh', 'VA', 'Designer', 2018, 0, 'm', 0, 'Fashion & design'],
    ['lauder', 'Estée Lauder', 'Estée Lauder', 'EL', 'Founder', 1946, 0, 'f', 0, 'Business', 'Estée_Lauder_(businesswoman)'],
    ['buffett', 'Warren Buffett', 'Buffett', 'WB', 'Investor', 1965, 0, 'm', 0, 'Business'],
    ['schultz', 'Howard Schultz', 'Schultz', 'HS', 'Builder of Starbucks', 1987, 0, 'm', 0, 'Business'],
    ['huang', 'Jensen Huang', 'Huang', 'JH', 'Co-founder, Nvidia', 1993, 0, 'm', 0, 'Business'],
    ['blakely', 'Sara Blakely', 'Sara Blakely', 'SB', 'Founder, Spanx', 2000, 0, 'f', 0, 'Business'],
    ['barra', 'Mary Barra', 'Mary Barra', 'MB', 'CEO, General Motors', 2014, 0, 'f', 0, 'Business'],
    ['wolfeherd', 'Whitney Wolfe Herd', 'Wolfe Herd', 'WW', 'Founder, Bumble', 2014, 0, 'f', 0, 'Business'],
    ['albright', 'Madeleine Albright', 'Albright', 'MA', 'Secretary of State', 1997, 0, 'f', 0, 'Politics & public life'],
    ['sotomayor', 'Sonia Sotomayor', 'Sotomayor', 'SS', 'Supreme Court Justice', 2009, 0, 'f', 0, 'Politics & public life'],
    ['curie', 'Marie Curie', 'Curie', 'MC', 'Physicist, chemist', 1911, 0, 'f', 0, 'Science & invention'],
    ['bernerslee', 'Tim Berners-Lee', 'Berners-Lee', 'TB', 'Inventor of the web', 1989, 0, 'm', 0, 'Science & invention'],
    ['doudna', 'Jennifer Doudna', 'Doudna', 'JD', 'Biochemist', 2012, 0, 'f', 0, 'Science & invention'],
    ['tyson', 'Neil deGrasse Tyson', 'Tyson', 'NT', 'Astrophysicist', 2014, 0, 'm', 0, 'Science & invention'],
    ['kahlo', 'Frida Kahlo', 'Kahlo', 'FK', 'Painter', 1939, 0, 'f', 0, 'Art'],
    ['warhol', 'Andy Warhol', 'Warhol', 'AW', 'Artist', 1962, 0, 'm', 0, 'Art'],
    ['basquiat', 'Jean-Michel Basquiat', 'Basquiat', 'JB', 'Artist', 1982, 0, 'm', 0, 'Art'],
    ['kusama', 'Yayoi Kusama', 'Kusama', 'YK', 'Artist', 2017, 0, 'f', 0, 'Art'],
    ['banksy', 'Banksy', 'Banksy', 'B', 'Artist', 2018, 0, 'm', 0, 'Art'],
    ['wiley', 'Kehinde Wiley', 'Wiley', 'KW', 'Painter', 2018, 0, 'm', 0, 'Art'],
    ['angelou', 'Maya Angelou', 'Angelou', 'MA', 'Poet, memoirist', 1969, 0, 'f', 0, 'Books & writing'],
    ['sking', 'Stephen King', 'Stephen King', 'SK', 'Novelist', 1974, 0, 'm', 0, 'Books & writing'],
    ['morrison', 'Toni Morrison', 'Morrison', 'TM', 'Novelist, editor', 1987, 0, 'f', 0, 'Books & writing'],
    ['adichie', 'Chimamanda Ngozi Adichie', 'Adichie', 'CA', 'Novelist', 2013, 0, 'f', 0, 'Books & writing'],
    ['coates', 'Ta-Nehisi Coates', 'Coates', 'TC', 'Writer', 2015, 0, 'm', 0, 'Books & writing'],
    ['gorman', 'Amanda Gorman', 'Gorman', 'AG', 'Poet', 2021, 0, 'f', 0, 'Books & writing'],
    ['child', 'Julia Child', 'Julia Child', 'JC', 'Cook, broadcaster', 1963, 0, 'f', 0, 'Food'],
    ['waters', 'Alice Waters', 'Alice Waters', 'AW', 'Chef, founder', 1971, 0, 'f', 0, 'Food'],
    ['bourdain', 'Anthony Bourdain', 'Bourdain', 'AB', 'Chef, writer', 2000, 0, 'm', 0, 'Food'],
    ['chang', 'David Chang', 'David Chang', 'DC', 'Chef, founder', 2004, 0, 'm', 0, 'Food'],
    ['andres', 'José Andrés', 'José Andrés', 'JA', 'Chef, founder of World Central Kitchen', 2017, 0, 'm', 0, 'Food', 'José_Andrés'],
    ['nosrat', 'Samin Nosrat', 'Nosrat', 'SN', 'Cook, writer', 2017, 0, 'f', 0, 'Food'],
    ['goodall', 'Jane Goodall', 'Goodall', 'JG', 'Primatologist', 1960, 0, 'f', 0, 'Exploration'],
    ['armstrong', 'Neil Armstrong', 'Armstrong', 'NA', 'Astronaut', 1969, 0, 'm', 0, 'Exploration'],
    ['tabei', 'Junko Tabei', 'Tabei', 'JT', 'Mountaineer', 1975, 0, 'f', 0, 'Exploration'],
    ['earle', 'Sylvia Earle', 'Earle', 'SE', 'Oceanographer', 1979, 0, 'f', 0, 'Exploration'],
    ['jemison', 'Mae Jemison', 'Jemison', 'MJ', 'Astronaut, physician', 1992, 0, 'f', 0, 'Exploration'],
    ['honnold', 'Alex Honnold', 'Honnold', 'AH', 'Climber', 2017, 0, 'm', 0, 'Exploration'],
    ['huerta', 'Dolores Huerta', 'Huerta', 'DH', 'Labour organiser', 1965, 0, 'f', 0, 'Faith & activism'],
    ['tutu', 'Desmond Tutu', 'Tutu', 'DT', 'Archbishop', 1984, 0, 'm', 0, 'Faith & activism'],
    ['dalai', 'Dalai Lama', 'Dalai Lama', 'DL', 'Spiritual leader', 1989, 0, 'm', 0, 'Faith & activism', '14th_Dalai_Lama'],
    ['francis', 'Pope Francis', 'Pope Francis', 'PF', 'Pope', 2013, 0, 'm', 0, 'Faith & activism'],
    ['thunberg', 'Greta Thunberg', 'Thunberg', 'GT', 'Climate activist', 2018, 0, 'f', 0, 'Faith & activism']
  ];
  P2.forEach(function (r) { var h = { id: r[0], name: r[1], short: r[2], ini: r[3], desc: r[4], year: r[5], salient: r[6] || 0, sex: r[7], cross: !!r[8], area: r[9], q: [], canon: r[9] === 'Leader', stance: '', wiki: r[10] || r[1].replace(/ /g, '_') }; heroes.push(h); hero[h.id] = h; });
  // Three qualities for the scripted heroes (rebrief §6); everyone else shows the descriptor only
  var Q = { mrbeast: ['Built an audience from nothing', 'Reinvests everything', 'Tests in public'], biles: ['Raised the bar for everyone', 'Knew her limits and said so', 'Came back on her terms'], saujani: ["Built a room for people who weren't being called", 'Asked in public', 'Kept going after losing'], serena: ['Owned the stage', 'Answered pressure with play', 'Built beyond the game'], rihanna: ['Built something of her own', 'Made room for people the industry missed', 'Kept her name on it'], jordan: ['Asked more of everyone', 'Wanted the last shot', 'Turned a name into a business'] };
  Object.keys(Q).forEach(function (k) { hero[k].q = Q[k]; });
  var pools = {
    leaders: ['obama', 'michelle', 'mlk', 'jfk', 'mandela', 'oprah', 'jobs', 'rbg', 'carter', 'ride', 'malala', 'ardern', 'saujani', 'nadella', 'kjohnson', 'nooyi', 'merkel', 'eleanor', 'churchill', 'powell'],
    'Music': ['aretha', 'marley', 'prince', 'tina', 'springsteen', 'beyonce', 'rihanna', 'swift', 'badbunny', 'stevie', 'dolly'],
    'Sport': ['ali', 'jordan', 'serena', 'biles', 'lebron', 'bjk', 'magic', 'rapinoe', 'gauff', 'clark'],
    'Film & TV': ['spielberg', 'zendaya', 'lucille', 'spikelee', 'shonda', 'duvernay'],
    'Creators': ['mrbeast', 'chamberlain', 'mkbhd', 'cooper', 'lilly', 'neistat'],
    'Fashion & design': ['chanel', 'lauren', 'dvf', 'prada', 'ive', 'abloh'],
    'Business': ['lauder', 'buffett', 'schultz', 'huang', 'blakely', 'barra', 'wolfeherd'],
    'Politics & public life': ['golda', 'powell', 'albright', 'merkel', 'sotomayor', 'ardern'],
    'Science & invention': ['curie', 'kjohnson', 'ride', 'bernerslee', 'doudna', 'tyson'],
    'Art': ['kahlo', 'warhol', 'basquiat', 'kusama', 'banksy', 'wiley'],
    'Books & writing': ['angelou', 'sking', 'morrison', 'adichie', 'coates', 'gorman'],
    'Food': ['child', 'waters', 'bourdain', 'chang', 'andres', 'nosrat'],
    'Exploration': ['goodall', 'armstrong', 'tabei', 'earle', 'jemison', 'honnold'],
    'Faith & activism': ['huerta', 'tutu', 'dalai', 'francis', 'malala', 'thunberg']
  };
  // Library counts seen in the corpus explorer, 14 October (rebrief §7): [stories, situations covered]
  var LIB = { obama: [4, ['A2', 'B4']], michelle: [3, ['B5', 'E1']], mlk: [2, ['D4', 'E1']], bjk: [3, ['A2', 'C1', 'D3']], rbg: [2, ['B2', 'C3']], ride: [2, ['A1', 'E1']], ardern: [2, ['D4', 'E1']], kjohnson: [2, ['A1', 'B6']], churchill: [3, ['B6', 'D4', 'E3']], golda: [2, ['B6', 'C1']], morrison: [2, ['B5', 'D3']], jobs: [1, ['E3']], nooyi: [1, ['E3']], merkel: [1, ['E4']], marley: [1, ['C2']], swift: [1, ['E2']], rapinoe: [1, ['D4']], gauff: [1, ['B3']], albright: [1, ['D2']], sotomayor: [1, ['E1']], angelou: [1, ['B2']], gorman: [1, ['B4']], schultz: [1, ['A2']], lauder: [1, ['B6']], warhol: [1, ['C1']], kahlo: [1, ['B4']], barra: [1, ['A5']], huerta: [1, ['C3']], ali: [2, ['C2', 'B5']] };
  var coaches = {
    jim: { id: 'jim', name: 'Jim Elms', first: 'Jim', ini: 'JE', title: 'Lead coach', spec: 'General leadership', pro: 'He' },
    bret: { id: 'bret', name: 'Bret Leece', first: 'Bret', ini: 'BL', title: 'Coach', spec: 'Analytics, research and product leaders, and the politics around them', pro: 'He' },
    jennifer: { id: 'jennifer', name: 'Jennifer Talbott', first: 'Jennifer', ini: 'JT', title: 'Coach', spec: 'Personal brand and voice', pro: 'She' }
  };
  // Public moments, from Pew's lists of the events each generation called most important. Nothing else goes here.
  var PEW = [[1989, 'Berlin Wall falls'], [1991, 'Gulf War'], [2001, 'September 11'], [2008, 'Obama elected'], [2015, 'Marriage equality']];

  var stories = [
    { id: 'st-ali-1967-induction', hero: 'ali', place: 'Houston, April 1967', keys: ['saying-it-in-your-own-words'], reach: 'far', verified: false,
      moment: 'On 28 April 1967, at the induction centre in Houston, his name was called and he did not step forward. Within hours the boxing authorities moved to strip his title. He did not fight again for three and a half years, and he did not change his account of why.',
      pattern: '', by: '', why: 'Chosen because there are weeks when you have to say where you stand, out loud, and keep saying it.',
      source: 'Not yet sourced. Several versions of his best-known line on the war circulate; none is confirmed.', caution: '', gist: 'He did not step forward, and did not change his account of why.', walk: '' },
    { id: 'st-bjk-1973-riggs', hero: 'bjk', place: 'Houston, September 1973', keys: ['agreeing-and-not-moving', 'every-act-is-a-message'], reach: 'mid', verified: true,
      moment: 'She had turned Bobby Riggs down. Then Margaret Court accepted, and lost. King understood what a second loss would cost every woman in the game, and said yes. On 20 September 1973, in the Houston Astrodome, in front of more than thirty thousand people and a vast television audience, she won in straight sets.',
      pattern: "I thought it would set us back 50 years if I didn't win that match.", by: '', why: "Chosen because the thing you've been avoiding gets more expensive every week you wait.",
      source: 'billiejeanking.com, “Battle of the Sexes”; check quote against a primary interview.', caution: '', gist: 'She took the match she had turned down, once waiting cost more.', walk: "take the conversation you've been avoiding, and set its terms." },
    { id: 'st-jackie-robinson-1945-rickey', hero: 'jackie', place: 'Brooklyn, August 1945', keys: ['every-act-is-a-message', 'style-against-expectation'], reach: 'mid', verified: true,
      moment: "Branch Rickey wanted him to break baseball's colour line, and spent the meeting acting out the abuse he would face — the slurs, the spikes, the umpires. Robinson asked if Rickey wanted a player who was afraid to fight back. Rickey said no. He agreed to take it, without answering, for his first seasons.",
      pattern: "I'm looking for a ballplayer with guts enough not to fight back.", by: 'Rickey, as Robinson told it', why: 'Chosen because, for a while, your restraint will say more than anything you could answer back.',
      source: 'Robinson, I Never Had It Made (1972). Check wording.', caution: 'The restraint was a condition, not a temperament. Robinson spoke out forcefully once it lifted.', gist: 'He agreed to take it without answering, for a while.', walk: 'let the first reaction pass without an answer.' },
    { id: 'st-michelle-obama-2016-go-high', hero: 'michelle', place: 'Philadelphia, July 2016', keys: ['every-act-is-a-message', 'contradictory-feedback'], reach: 'mid', verified: true,
      moment: 'Opening night of the 2016 Democratic convention, in the ugliest campaign in memory. She never named the opponent. She talked about raising two daughters in the White House, and about what she and her husband told them to do when someone was cruel.',
      pattern: 'When they go low, we go high.', by: '', why: 'Chosen because the room will be watching how you respond, more than what you say.',
      source: 'Full text, ABC News, 25 July 2016.', caution: '', gist: 'She never named the opponent.', walk: "don't name the person. Say what you stand for, and let the room compare." },
    { id: 'st-obama-2008-clinton', hero: 'obama', place: 'Chicago, December 2008', keys: ['renegotiating-standing', 'coalition-without-mandate'], reach: 'mid', verified: true,
      moment: 'He had just beaten Hillary Clinton in a primary that ran seventeen months. Four weeks after the election he named her Secretary of State — the senior post in his cabinet — and announced it standing next to her, with the rest of his national security team.',
      pattern: '', by: '', why: 'Chosen because, like you, he had to lead alongside someone who had wanted his job.',
      source: 'NPR, “Obama Unveils National Security Team,” 1 Dec 2008.', caution: '', gist: 'He gave his rival the senior post, and stood next to her to announce it.', walk: 'give the person who wanted your job the senior seat, and stand next to them when you say it.' },
    { id: 'st-obama-2008-more-perfect-union', hero: 'obama', place: 'Philadelphia, March 2008', keys: ['every-act-is-a-message', 'naming-an-unseen-problem'], reach: 'mid', verified: true,
      moment: "Video of his former pastor's sermons was running on every channel. He did not issue a short statement and move on. On 18 March 2008, at the National Constitution Center in Philadelphia, he gave a long speech on race in America — condemning the remarks, refusing to disown the man, and naming the grievance on more than one side.",
      pattern: 'I can no more disown him than I can disown the black community.', by: '', why: 'Chosen because everything you say this week will be read for what it means, not just what it says.',
      source: '“A More Perfect Union,” transcript, National Constitution Center.', caution: '', gist: 'He said the hardest part himself, at length, once.', walk: 'say the hardest part yourself, before anyone else frames it.' },
    { id: 'st-stevie-wonder-1971-motown', hero: 'stevie', place: 'Detroit, 1971', keys: ['credit-and-attribution', 'unclassifiable-profile'], reach: 'mid', verified: true,
      moment: 'He turned twenty-one in May 1971 and his Motown contract ended. He did not re-sign on the old terms. He recorded on his own, then went back to the label with the work in hand. The contract he signed gave him control of his own records.',
      pattern: '', by: '', why: 'Chosen because the work is yours, and so is how it reaches people.',
      source: 'Music of My Mind release history; check against a primary biography.', caution: 'Royalty figures that circulate online are unverified. Do not add them.', gist: 'He went back to the label with the finished work in hand.', walk: 'put your name on the work. You built it.' },
    { id: 'st-kjohnson-1958-langley', hero: 'kjohnson', place: 'Langley, Virginia, late 1950s', keys: ['expertise-without-pull'], reach: 'mid', verified: false, origin: 'corpus',
      moment: 'Langley, Virginia, late 1950s: Johnson, a mathematician in the Flight Research Division, did calculations the engineers built on, yet the engineers\' briefings where the space work was decided were closed to the women computers. She kept asking to attend and asked whether any rule barred her. None did, and she began sitting in. Within a few years flight crews relied on her numbers.',
      pattern: 'Is there a law against it?', by: '', why: "Chosen because getting into the room where it's decided is your work this year.",
      source: 'Corpus draft. NASA oral-history interviews describe her asking to attend the briefings; verify the wording.', caution: '', gist: 'She asked whether any rule barred her. None did.', walk: 'ask whether any rule actually bars you from the room. Then sit in.' },
    { id: 'st-obama-1990-law-review', hero: 'obama', place: 'Cambridge, February 1990', keys: ['renegotiating-standing'], reach: 'mid', verified: false, origin: 'corpus',
      moment: 'Elected president of the Harvard Law Review in February 1990 by a board split into factions, he gave senior posts to editors who had opposed him, including conservatives who had voted against him. Some of his own supporters felt passed over. The Review came out on time.',
      pattern: '', by: '', why: "Chosen because the people who didn't back you still have to work with you on Monday.",
      source: 'Corpus draft. Remnick, The Bridge (2010); verify the appointments detail.', caution: '', gist: 'He gave posts to the editors who had opposed him.', walk: 'ask the person who ran against you for the number, out loud, in front of the group.' },
    { id: 'st-schultz-1987-seattle', hero: 'schultz', place: 'Seattle, August 1987', keys: ['renegotiating-standing'], reach: 'mid', verified: false, origin: 'corpus',
      moment: 'He had run marketing for the founders and left when they would not back his idea. Two years later, in August 1987, he bought the company from them. The first thing he did was make his case in person, in the roasting plant, to people who had known him as a colleague.',
      pattern: '', by: '', why: 'Chosen because, like you, he had to lead people who remembered him as a peer.',
      source: 'Corpus draft. Verify against Schultz, Pour Your Heart Into It (1997).', caution: '', gist: 'He made his case in person to people who had known him as a colleague.', walk: "let their call stand when you'd have changed it." },
    { id: 'st-ali-1964-miami', hero: 'ali', place: 'Miami Beach, February 1964', keys: ['borrowed-versus-owned-standing'], reach: 'mid', verified: false, origin: 'corpus',
      moment: 'On 25 February 1964 he took the heavyweight title from Sonny Liston as Cassius Clay. The next morning he confirmed he was a member of the Nation of Islam, and within weeks he was introducing himself by a new name and insisting on it, whatever the press printed.',
      pattern: "I don't have to be what you want me to be.", by: '', why: "Chosen because standing on your own name, not the firm's, is the work this year.",
      source: 'Corpus draft. Press conference, Miami Beach, 26 February 1964; the name followed on 6 March. Verify wording.', caution: '', gist: 'Within weeks he was introducing himself by a new name.', walk: 'say your one thing in the first two minutes, before the credentials.' },
    { id: 'st-marley-1960s-kingston', hero: 'marley', place: 'Kingston, late 1960s', keys: ['borrowed-versus-owned-standing'], reach: 'mid', verified: false, origin: 'corpus',
      moment: 'The Wailers had recorded for other people\'s labels and seen little of the money. By the end of the decade they had started their own imprint and were putting their records out themselves, selling them from a shop in Trench Town.',
      pattern: '', by: '', why: 'Chosen because the name on the record is the thing you own.',
      source: 'Corpus draft. Verify against White, Catch a Fire (1983).', caution: '', gist: 'They put their records out under their own imprint.', walk: 'leave the credentials slide out, once.' },
    { id: 'st-bjk-1973-gloucester', hero: 'bjk', place: 'London, June 1973', keys: ['renegotiating-standing', 'coalition-without-mandate'], reach: 'mid', verified: false, origin: 'corpus',
      moment: 'A week before Wimbledon, in a room at the Gloucester Hotel, she got more than sixty women players to agree to form their own association, with her as its first president. The day before, she had been one of them.',
      pattern: '', by: '', why: 'Chosen because you had to become the person who speaks for people who were your peers.',
      source: 'Corpus draft. WTA founding, Gloucester Hotel, 21 June 1973. Verify the numbers.', caution: '', gist: 'The day before, she had been one of them.', walk: '' }
  ];
  var story = {}; stories.forEach(function (s) { story[s.id] = s; });
  var DEEP = { 'st-ali-1967-induction': ['ali-trials', 'ali-burns', 'ali-greatest'], 'st-bjk-1973-riggs': ['bjk-allin', 'bjk-bots'], 'st-jackie-robinson-1945-rickey': ['jackie-inhm', 'jackie-42', 'jackie-burns'], 'st-michelle-obama-2016-go-high': ['michelle-becoming', 'michelle-becoming-doc'], 'st-obama-2008-clinton': ['obama-promised', 'obama-hbo'], 'st-obama-2008-more-perfect-union': ['obama-promised', 'obama-hbo'], 'st-stevie-wonder-1971-motown': ['stevie-pod', 'stevie-ribowsky'], 'st-kjohnson-1958-langley': ['kj-hidden', 'kj-film'], 'st-obama-1990-law-review': ['obama-bridge', 'obama-dreams'], 'st-schultz-1987-seattle': ['schultz-pour'], 'st-ali-1964-miami': ['ali-remnick', 'ali-kings'], 'st-marley-1960s-kingston': ['marley-white', 'marley-doc'], 'st-bjk-1973-gloucester': ['bjk-allin'] };
  stories.forEach(function (s) { s.deeper = DEEP[s.id] || []; });

  // Things to read, listen to and watch about each hero. Real works; links open a public catalogue search so nothing dead-ends.
  var W = [
    ['obama-promised', 'obama', 'book', 'Memoir', 'A Promised Land', 'Barack Obama', 2020, 'His own account of the 2008 campaign and the first term, including how the cabinet was built.'],
    ['obama-dreams', 'obama', 'book', 'Memoir', 'Dreams from My Father', 'Barack Obama', 1995, 'The early memoir, written before politics.'],
    ['obama-renegades', 'obama', 'audio', 'Podcast', 'Renegades: Born in the USA', 'Barack Obama and Bruce Springsteen', 2021, 'Eight conversations about fathers, race and the country.'],
    ['obama-hbo', 'obama', 'film', 'Documentary', 'Obama: In Pursuit of a More Perfect Union', 'Peter Kunhardt, HBO', 2021, 'Three parts, on his life and presidency.'],
    ['michelle-becoming', 'michelle', 'book', 'Memoir', 'Becoming', 'Michelle Obama', 2018, 'Her memoir. The 2016 convention speech is in it.'],
    ['michelle-light', 'michelle', 'book', 'Essays', 'The Light We Carry', 'Michelle Obama', 2022, 'On the habits that steady her in uncertain times.'],
    ['michelle-imo', 'michelle', 'audio', 'Podcast', 'IMO with Michelle Obama and Craig Robinson', 'Michelle Obama and Craig Robinson', 2025, 'A weekly show with her brother.'],
    ['michelle-becoming-doc', 'michelle', 'film', 'Documentary', 'Becoming', 'Nadia Hallgren, Netflix', 2020, 'Follows the book tour.'],
    ['ali-trials', 'ali', 'film', 'Documentary', 'The Trials of Muhammad Ali', 'Bill Siegel', 2013, 'On the draft refusal and the years out of the ring.'],
    ['ali-burns', 'ali', 'film', 'Documentary', 'Muhammad Ali', 'Ken Burns, Sarah Burns and David McMahon, PBS', 2021, 'Four parts, from Louisville to Atlanta 1996.'],
    ['ali-greatest', 'ali', 'book', 'Memoir', 'The Greatest: My Own Story', 'Muhammad Ali with Richard Durham', 1975, 'His own account.'],
    ['ali-remnick', 'ali', 'book', 'Biography', 'King of the World', 'David Remnick', 1998, 'His rise, through the first Liston fight.'],
    ['ali-kings', 'ali', 'film', 'Documentary', 'When We Were Kings', 'Leon Gast', 1996, 'The Rumble in the Jungle, Kinshasa 1974.'],
    ['stevie-pod', 'stevie', 'audio', 'Podcast', 'The Wonder of Stevie', 'Wesley Morris, Higher Ground and Audible', 2024, 'On the five albums from 1972 to 1976 and the deal that made them possible.'],
    ['stevie-ribowsky', 'stevie', 'book', 'Biography', 'Signed, Sealed, and Delivered: The Soulful Journey of Stevie Wonder', 'Mark Ribowsky', 2010, 'A full biography.'],
    ['stevie-werner', 'stevie', 'book', 'History', 'Higher Ground: Stevie Wonder, Aretha Franklin, Curtis Mayfield, and the Rise and Fall of American Soul', 'Craig Werner', 2004, 'Three careers, set against the 1960s and 70s.'],
    ['jackie-inhm', 'jackie', 'book', 'Memoir', 'I Never Had It Made', 'Jackie Robinson with Alfred Duckett', 1972, 'His autobiography, and the source for the Rickey meeting.'],
    ['jackie-rampersad', 'jackie', 'book', 'Biography', 'Jackie Robinson: A Biography', 'Arnold Rampersad', 1997, 'The standard biography.'],
    ['jackie-burns', 'jackie', 'film', 'Documentary', 'Jackie Robinson', 'Ken Burns, Sarah Burns and David McMahon, PBS', 2016, 'Two parts.'],
    ['jackie-42', 'jackie', 'film', 'Film', '42', 'Brian Helgeland', 2013, 'The 1945 meeting with Rickey is an early scene.'],
    ['bjk-allin', 'bjk', 'book', 'Memoir', 'All In: An Autobiography', 'Billie Jean King', 2021, 'Her own account, including the 1973 match.'],
    ['bjk-bots', 'bjk', 'film', 'Film', 'Battle of the Sexes', 'Jonathan Dayton and Valerie Faris', 2017, 'A feature film about the 1973 match.'],
    ['bjk-hbo', 'bjk', 'film', 'Documentary', 'Billie Jean King: Portrait of a Pioneer', 'HBO', 2006, 'On her playing career and the founding of the tour.'],
    ['churchill-larson', 'churchill', 'book', 'History', 'The Splendid and the Vile', 'Erik Larson', 2020, '1940 to 1941, the year of the Blitz.'],
    ['churchill-roberts', 'churchill', 'book', 'Biography', 'Churchill: Walking with Destiny', 'Andrew Roberts', 2018, 'A single-volume life.'],
    ['churchill-darkest', 'churchill', 'film', 'Film', 'Darkest Hour', 'Joe Wright', 2017, 'May 1940, the first weeks as Prime Minister.'],
    ['golda-mylife', 'golda', 'book', 'Memoir', 'My Life', 'Golda Meir', 1975, 'Her autobiography.'],
    ['golda-lioness', 'golda', 'book', 'Biography', 'Lioness: Golda Meir and the Nation of Israel', 'Francine Klagsbrun', 2017, 'A full biography.'],
    ['golda-film', 'golda', 'film', 'Film', 'Golda', 'Guy Nattiv', 2023, 'Helen Mirren, in the days of the 1973 war.'],
    ['oprah-sure', 'oprah', 'book', 'Essays', 'What I Know for Sure', 'Oprah Winfrey', 2014, 'Her magazine columns, collected.'],
    ['oprah-path', 'oprah', 'book', 'Essays', 'The Path Made Clear', 'Oprah Winfrey', 2019, 'On purpose, drawn from her interviews.'],
    ['oprah-supersoul', 'oprah', 'audio', 'Podcast', "Oprah's Super Soul", 'Oprah Winfrey', null, 'Her long-form interviews, as a podcast.'],
    ['yoyoma-strangers', 'yoyoma', 'film', 'Documentary', 'The Music of Strangers: Yo-Yo Ma and the Silk Road Ensemble', 'Morgan Neville', 2015, 'On the ensemble he founded.'],
    ['yoyoma-beginners', 'yoyoma', 'audio', 'Audiobook', "Beginner's Mind", 'Yo-Yo Ma', 2021, 'An audio memoir, in his own voice, with cello.'],
    ['yoyoma-onbeing', 'yoyoma', 'audio', 'Podcast episode', 'On Being: Yo-Yo Ma — Music Happens Between the Notes', 'Krista Tippett', 2014, 'A long conversation.'],
    ['jfk-dallek', 'jfk', 'book', 'Biography', 'An Unfinished Life: John F. Kennedy, 1917–1963', 'Robert Dallek', 2003, 'A full biography.'],
    ['jfk-logevall', 'jfk', 'book', 'Biography', 'JFK: Coming of Age in the American Century, 1917–1956', 'Fredrik Logevall', 2020, 'Volume one, to 1956.'],
    ['jfk-profiles', 'jfk', 'book', 'History', 'Profiles in Courage', 'John F. Kennedy', 1956, 'His book on eight senators.'],
    ['jfk-13days', 'jfk', 'film', 'Film', 'Thirteen Days', 'Roger Donaldson', 2000, 'The Cuban missile crisis, October 1962.'],
    ['aretha-ritz', 'aretha', 'book', 'Biography', 'Respect: The Life of Aretha Franklin', 'David Ritz', 2014, 'A full biography.'],
    ['aretha-roots', 'aretha', 'book', 'Memoir', 'Aretha: From These Roots', 'Aretha Franklin with David Ritz', 1999, 'Her memoir.'],
    ['aretha-grace', 'aretha', 'film', 'Documentary', 'Amazing Grace', 'Sydney Pollack and Alan Elliott', 2018, 'The 1972 gospel concert, filmed.'],
    ['aretha-respect', 'aretha', 'film', 'Film', 'Respect', 'Liesl Tommy', 2021, 'Jennifer Hudson, through the 1972 Amazing Grace sessions.'],
    ['huff-thrive', 'huffington', 'book', 'Essays', 'Thrive', 'Arianna Huffington', 2014, 'On redefining success, written after her collapse from exhaustion.'],
    ['huff-fearless', 'huffington', 'book', 'Essays', 'On Becoming Fearless', 'Arianna Huffington', 2006, 'On fear, at work and in public.'],
    ['huff-pod', 'huffington', 'audio', 'Podcast', 'The Thrive Global Podcast', 'Arianna Huffington', 2017, 'Conversations on wellbeing and work.'],
    ['biles-courage', 'biles', 'book', 'Memoir', 'Courage to Soar', 'Simone Biles with Michelle Burford', 2016, 'Her memoir, written at nineteen.'],
    ['biles-rising', 'biles', 'film', 'Series', 'Simone Biles Rising', 'Katie Walsh, Netflix', 2024, 'Tokyo 2021 and the road back to Paris.'],
    ['biles-vs', 'biles', 'film', 'Series', 'Simone vs Herself', 'Gotham Chopra', 2021, 'The run-up to Tokyo.'],
    ['mlk-stride', 'mlk', 'book', 'Memoir', 'Stride Toward Freedom: The Montgomery Story', 'Martin Luther King Jr.', 1958, 'His own account of the bus boycott.'],
    ['mlk-eig', 'mlk', 'book', 'Biography', 'King: A Life', 'Jonathan Eig', 2023, 'A full biography, drawing on newly released files.'],
    ['mlk-branch', 'mlk', 'book', 'History', 'Parting the Waters: America in the King Years 1954–63', 'Taylor Branch', 1988, 'Volume one of a trilogy.'],
    ['mlk-wilderness', 'mlk', 'film', 'Documentary', 'King in the Wilderness', 'Peter Kunhardt, HBO', 2018, 'The last eighteen months, 1966 to 1968.'],
    ['nina-spell', 'nina', 'book', 'Memoir', 'I Put a Spell on You', 'Nina Simone with Stephen Cleary', 1991, 'Her autobiography.'],
    ['nina-noire', 'nina', 'book', 'Biography', 'Princess Noire: The Tumultuous Reign of Nina Simone', 'Nadine Cohodas', 2010, 'A full biography.'],
    ['nina-doc', 'nina', 'film', 'Documentary', 'What Happened, Miss Simone?', 'Liz Garbus, Netflix', 2015, 'From her own recordings and letters.'],
    ['staley-favor', 'staley', 'book', 'Memoir', 'Uncommon Favor', 'Dawn Staley', 2025, 'Her memoir: North Philly, her mother, and basketball.'],
    ['kj-hidden', 'kjohnson', 'book', 'History', 'Hidden Figures', 'Margot Lee Shetterly', 2016, 'The book that made her widely known.'],
    ['kj-film', 'kjohnson', 'film', 'Film', 'Hidden Figures', 'Theodore Melfi', 2016, 'Taraji P. Henson as Johnson.'],
    ['obama-bridge', 'obama', 'book', 'Biography', 'The Bridge: The Life and Rise of Barack Obama', 'David Remnick', 2010, 'Includes the Law Review election.'],
    ['schultz-pour', 'schultz', 'book', 'Memoir', 'Pour Your Heart Into It', 'Howard Schultz with Dori Jones Yang', 1997, 'His own account of buying the company.'],
    ['marley-white', 'marley', 'book', 'Biography', 'Catch a Fire: The Life of Bob Marley', 'Timothy White', 1983, 'The standard biography.'],
    ['marley-doc', 'marley', 'film', 'Documentary', 'Marley', 'Kevin Macdonald', 2012, 'Family-authorised, two and a half hours.'],
    ['jordan-dance', 'jordan', 'film', 'Series', 'The Last Dance', 'Jason Hehir, ESPN and Netflix', 2020, 'Ten parts: the 1997–98 season and everything before it.'],
    ['jordan-lazenby', 'jordan', 'book', 'Biography', 'Michael Jordan: The Life', 'Roland Lazenby', 2014, 'A full biography.'],
    ['serena-line', 'serena', 'book', 'Memoir', 'On the Line', 'Serena Williams with Daniel Paisner', 2009, 'Her memoir.'],
    ['serena-being', 'serena', 'film', 'Series', 'Being Serena', 'HBO', 2018, 'Five parts, 2017 to 2018.'],
    ['serena-king', 'serena', 'film', 'Film', 'King Richard', 'Reinaldo Marcus Green', 2021, 'Her father and the early years.'],
    ['rihanna-book', 'rihanna', 'book', 'Visual autobiography', 'Rihanna', 'Rihanna, Phaidon', 2019, 'Five hundred pages of photographs.'],
    ['mrbeast-lex', 'mrbeast', 'audio', 'Podcast episode', 'Lex Fridman Podcast #351: MrBeast', 'Lex Fridman', 2023, 'A long conversation on how he builds.'],
    ['saujani-brave', 'saujani', 'book', 'Essays', 'Brave, Not Perfect', 'Reshma Saujani', 2019, 'On the habit of perfection and what it costs.'],
    ['saujani-ted', 'saujani', 'film', 'Talk', 'Teach girls bravery, not perfection', 'TED', 2016, 'Eleven minutes.'],
    ['prince-ones', 'prince', 'book', 'Memoir', 'The Beautiful Ones', 'Prince, edited by Dan Piepenbring', 2019, 'The unfinished memoir.'],
    ['prince-rain', 'prince', 'film', 'Film', 'Purple Rain', 'Albert Magnoli', 1984, 'The film, and the album.'],
    ['mandela-walk', 'mandela', 'book', 'Memoir', 'Long Walk to Freedom', 'Nelson Mandela', 1994, 'His autobiography.'],
    ['jobs-isaacson', 'jobs', 'book', 'Biography', 'Steve Jobs', 'Walter Isaacson', 2011, 'The authorised biography.'],
    ['rbg-doc', 'rbg', 'film', 'Documentary', 'RBG', 'Betsy West and Julie Cohen', 2018, 'Her life and career.'],
    ['ardern-power', 'ardern', 'book', 'Memoir', 'A Different Kind of Power', 'Jacinda Ardern', 2025, 'Her memoir.'],
    ['tina-doc', 'tina', 'film', 'Documentary', 'Tina', 'Dan Lindsay and T.J. Martin, HBO', 2021, 'Her own account, on film.']
  ];
  var work = {};
  var works = W.map(function (r) { var w = { id: r[0], hero: r[1], kind: r[2], form: r[3], title: r[4], by: r[5], year: r[6], line: r[7] }; work[w.id] = w; return w; });

  var SI = [
    ['A1', 'A', 'nobody-told-you-what-the-job-asks', 'Nobody told you what the job asks', 'The job changed and nobody said how.'],
    ['A2', 'A', 'renegotiating-standing', 'The boss of people who were your peers', 'The people you sat beside now report to you.'],
    ['B3', 'B', 'contradictory-feedback', 'You were told one thing, then another', 'The ask keeps changing under you.'],
    ['B6', 'B', 'expertise-without-pull', 'Being heard in a room that decides', 'You know the answer and the room does not follow it.'],
    ['C1', 'C', 'selling-what-you-used-to-make', 'Selling what you used to make', 'You used to do the work. Now you have to win it.'],
    ['C2', 'C', 'borrowed-versus-owned-standing', "Standing that's yours, not the firm's", 'Clients come for the firm. You want them to come for you.'],
    ['C3', 'C', 'coalition-without-mandate', 'The decision gets made before the meeting', 'You need people who do not report to you.'],
    ['D3', 'D', 'stopping-the-old-work', 'Stopping work people are proud of', 'Something has to stop, and people built it.'],
    ['D4', 'D', 'carrying-somebody-elses-decision', "Carrying a decision you didn't make", 'You have to stand behind a call that was not yours.'],
    ['E1', 'E', 'every-act-is-a-message', 'Everything you do gets read as a signal', 'Everything you do is read for what it means.'],
    ['E2', 'E', 'agreeing-and-not-moving', 'Everyone agrees, and nothing moves', 'The room says yes and nothing changes.'],
    ['', '·', 'naming-an-unseen-problem', 'Naming a problem nobody sees', ''],
    ['', '·', 'style-against-expectation', 'Not the style they expected', ''],
    ['', '·', 'credit-and-attribution', 'Getting credit for your work', ''],
    ['', '·', 'unclassifiable-profile', 'Hard to place', ''],
    ['', '·', 'saying-it-in-your-own-words', 'Saying it in your own words', '']
  ];
  var sit = {}, sitByKey = {};
  var sits = SI.map(function (r) { var s = { id: r[0], fam: r[1], key: r[2], chip: r[3], line: r[4] }; if (r[0]) sit[r[0]] = s; sitByKey[r[2]] = s; return s; });

  var members = {
    sarah: { id: 'sarah', name: 'Sarah Kessler', first: 'Sarah', ini: 'SK', sex: 'f', age: 41, born: 1985, gen: 'Millennial, older', grew: 'United States', coach: 'jim', status: 'oc', last: '2 days ago', move: 'Give the person who wanted your job the best work, in front of the room.', events: [], role: 'Group account director, newly promoted', co: 'Northlight', goal: 'Running the group a year from now, and the obvious choice for the next one.', sits: ['A2', 'E1', 'D3'], ints: ['Sport', 'Music'], core: ['obama', 'serena', 'rihanna'], reserve: 'michelle', finalists: ['obama', 'serena', 'rihanna', 'michelle'], keep3: ['obama', 'serena', 'rihanna'], next: 'Tue 20 Oct, 10:00', up19: { label: 'Thu 22 Oct · Reorg announcement', sit: 'E1' },
      fit: { obama: ['up', "His record is full of rivals kept close. That's the room you're walking into."], serena: ['partly', 'Her stories are mostly about owning the stage. Useful for some of your weeks, not all.'], rihanna: ['partly', "Mostly about building something of your own. Useful for the weeks you're making the group yours."] },
      mv: { sit: 'A2', trigger: 'Your first full group meeting, week one.', behaviour: 'Give the person who wanted your job the best work, in front of the room.', grain: 'Out of the way (giving credit)', failure: "You'll do it privately, to spare his feelings. Privately it reads as a consolation prize. It only works where it's witnessed.", obs: 'The handover happened where others saw it.', retire: 'He raises things with you unprompted.' },
      micro: [{ w: 1, b: 'Give him the account, in the room.', o: 'The room saw the handover.', ins: { story: 'st-obama-2008-clinton', src: 'core' } }, { w: 2, b: 'Ask him for the number, out loud.', o: 'He answered in front of the group.', ins: { story: 'st-obama-1990-law-review', src: 'core' } }, { w: 4, b: "Let his call stand when you'd have changed it.", o: 'You did not reverse it.', ins: { story: 'st-schultz-1987-seattle', src: 'coach' } }, { w: 6, b: 'Say his name to the client, first.', o: 'The client heard his name from you.', ins: null }],
      line: { text: 'You know this one better than I do. Run it, and tell me what you need.', found: 'Session 1, said about the Halverson account', reh: 'practising' },
      note12: "Read this before Thursday. Notice that he didn't explain himself.", ask1: "I'm announcing the reorg to the whole group on Thursday and Dan wanted my job.", askLabel: 'Ask: the reorg',
      rooms: [['First group meeting with the full team', 'First group meeting'], ['Reorganisation announcement to the group', 'Reorganisation announcement']],
      pend: { name: 'Dawn Staley', hero: 'staley', why: 'Watching her coach this season' },
      self: [['Lean into', 'Generosity with credit. You give it easily and people notice.'], ['Watch for', 'Explaining yourself after a decision should stand.'], ['Off the table', "Performing a toughness you don't feel."]] },
    maya: { id: 'maya', name: 'Maya Okonkwo', first: 'Maya', ini: 'MO', sex: 'f', age: 32, born: 1994, gen: 'Millennial, younger', grew: 'United States', coach: 'bret', role: 'Product lead, newly promoted', co: 'Fernhill Labs', goal: 'Be the person they call before the decision, not after it.', sits: ['B6', 'C3', 'E1'], ints: ['Creators', 'Sport', 'Film & TV'], core: ['mrbeast', 'biles', 'saujani'], reserve: 'michelle', finalists: ['mrbeast', 'biles', 'saujani', 'michelle'], keep3: ['mrbeast', 'biles', 'saujani'], status: 'oc', last: '1 day ago', next: 'Tue 20 Oct, 11:00', up19: { label: 'Thu 22 Oct · Roadmap decision', sit: 'B6' },
      fit: { saujani: ['up', "Built a room for people who weren't being called. That's the room you want."], biles: ['partly', "Her record is about calling what you see, even when it's unwelcome. Useful for some of your weeks."], mrbeast: ['partly', 'Mostly about building an audience. Useful for the weeks you need to be seen.'] },
      mv: { sit: 'B6', trigger: 'The product review, the week before the roadmap decision.', behaviour: 'Send one paragraph with a position in it to one person, the day before the meeting.', grain: 'On paper first (you think in writing)', failure: "You'll send analysis, not a position.", obs: 'Someone replies to the position, not the data.', retire: 'You are asked for your view before the meeting.' },
      move: 'Send one paragraph with a position in it to one person, the day before the meeting.',
      micro: [{ w: 1, b: 'Send it to one person.', o: 'One person had your position before the meeting.', ins: { story: 'st-kjohnson-1958-langley', src: 'close', closeTo: 'saujani' } }, { w: 2, b: 'Say the number that would change your mind, out loud.', o: 'The room heard the number.', ins: null }, { w: 4, b: 'Ask to be in the decision meeting itself.', o: 'You asked, in writing.', ins: null }, { w: 6, b: 'Open the meeting with your position.', o: 'Your position was the first thing said.', ins: null }],
      line: { text: "Here's where I land, and the one number that would change my mind.", found: 'Session 1, said about the roadmap review', reh: 'practising' },
      note12: 'Read this before Thursday. She asked whether any rule barred her. Ask the same question.', ask1: "The roadmap review is Thursday and the VP will decide with the two directors after I've presented.", askLabel: 'Ask: the roadmap review',
      rooms: [['Product review with the directors', 'Product review'], ['Roadmap decision meeting', 'Roadmap decision']],
      pend: { name: 'Shonda Rhimes', hero: 'shonda', why: 'Finished Year of Yes last month' },
      talk: ['The product review: did anyone reply to the position, or to the data?', 'Her three have no stories in the record yet. Suggest Ardern or Gauff?', 'Which meeting is the one she should ask to be in?'],
      self: [['Lean into', 'Precision. When you commit to a number, people trust it.'], ['Watch for', 'Answering a question nobody asked, with data.'], ['Off the table', 'Pretending to be certain when you are not.']], events: [] },
    michael: { id: 'michael', name: 'Michael Brandt', first: 'Michael', ini: 'MB', sex: 'm', age: 58, born: 1968, gen: 'Gen X', grew: 'United States', coach: 'jennifer', role: 'Managing partner, newly elected', co: 'Hale & Carver LLP', goal: "The partner clients ask for by name, not the firm's name on the door.", sits: ['C2', 'C1', 'E1'], ints: ['Music', 'Sport'], core: ['ali', 'jordan', 'obama'], reserve: 'prince', finalists: ['ali', 'jordan', 'obama', 'prince'], keep3: ['ali', 'jordan', 'obama'], status: 'quiet', last: '9 days ago', next: 'Tue 20 Oct, 15:00', up19: { label: 'Thu 22 Oct · Calder Foods pitch', sit: 'C2' },
      fit: { obama: ['up', 'His record is full of moments he spoke in his own words before anyone else framed him.'], jordan: ['partly', "Jordan's stories are mostly about asking more of the people around you. Useful for the weeks you lead the team, less for the client's room."], ali: ['pulls', 'Ali won by saying it first and loudest. Your goal needs clients to choose you, quietly. Jennifer will talk to you about how to use him.'] },
      mv: { sit: 'C2', trigger: 'Every pitch, starting with Ardent Health this month.', behaviour: "In every pitch, say one thing only you would say, before the firm's credentials.", grain: 'Out front (you like the opening)', failure: "Your first version will still be the firm's line, shortened.", obs: "A client repeats your point back to you, not the firm's.", retire: 'A client asks for you by name.' },
      move: "In every pitch, say one thing only you would say, before the firm's credentials.",
      micro: [{ w: 1, b: 'Say your one thing in the first two minutes.', o: 'It came before the credentials.', ins: { story: 'st-ali-1964-miami', src: 'core' } }, { w: 2, b: "Take the client's first question yourself.", o: 'You answered it, not the senior associate.', ins: null }, { w: 4, b: 'Leave the credentials slide out, once.', o: 'The deck had no credentials slide.', ins: { story: 'st-marley-1960s-kingston', src: 'coach' } }, { w: 6, b: "Ask the client what they'd call you for.", o: 'They named something.', ins: null }],
      line: { text: "I'll tell you what I'd do, and why I'm the one to do it.", found: 'Session 1, said about the Ardent pitch', reh: 'practising' },
      note12: 'Read this before Thursday. He changed his name the morning after. Notice how little he explained.', ask1: "The Ardent pitch is Thursday and their general counsel knows the firm, not me.", askLabel: 'Ask: the Ardent pitch',
      rooms: [['Pitch to Ardent Health', 'Ardent pitch'], ['Pitch to Calder Foods', 'Calder pitch']],
      pend: { name: 'Bruce Springsteen', hero: 'springsteen', why: 'Reading Born to Run again' },
      talk: ['The Ardent pitch: what did he say before the credentials?', 'Ali is scoped to C2. Does Miami Beach land, or does it read as bravado?', 'Who at Ardent should hear his name first?'],
      self: [['Lean into', 'Judgement. Clients repeat your calls back to you.'], ['Watch for', "Reaching for the firm's credentials when you are nervous."], ['Off the table', "Talking down the people who built the firm's name."]], events: [] },
    david: { id: 'david', name: 'David Okafor', first: 'David', ini: 'DO', role: 'Partner, newly made', co: 'Hale & Carver LLP', goal: 'The partner clients ask for by name.', sits: ['C1', 'C2'], core: ['michelle', 'bjk', 'jfk'], reserve: 'mlk', status: 'oc', last: '2 days ago', next: 'Thu 22 Oct, 16:30', move: 'End every client conversation with a specific next step and a date, out loud.', line: "Here's what I'd do next, and when.", up19: { label: 'Tue 20 Oct · Pitch to Ardent Health', sit: 'C1' },
      events: [{ day: 16, icon: 'ph-circles-two', title: 'Marks · ran the move, said the line', detail: 'After the Ardent prep call' }, { day: 12, icon: 'ph-chat-circle', title: 'Message', detail: 'Ardent moved the pitch to Tuesday.' }] },
    priya: { id: 'priya', name: 'Priya Raman', first: 'Priya', ini: 'PR', role: 'VP Strategy', co: 'Fernhill Group', goal: 'In the room where the decision gets made.', sits: ['B6', 'C3'], core: ['golda', 'yoyoma', 'oprah'], reserve: 'aretha', status: 'one', last: '1 day ago', next: 'Mon 19 Oct, 09:00', move: 'Send one paragraph with a position in it to one person before the meeting.', line: "I'll say where I land, then I want to hear where you do.", up19: { label: 'Mon 19 Oct · Steering committee', sit: 'C3' },
      events: [{ day: 16, icon: 'ph-circle', title: 'Mark · ran the move', detail: '9 marks since onboarding, all acted' }] },
    tom: { id: 'tom', name: 'Tom Whitfield', first: 'Tom', ini: 'TW', role: 'CMO, six weeks in', co: 'Calder Foods', goal: 'Leading the change, not being changed by it.', sits: ['D4', 'E2'], core: ['jackie', 'biles', 'obama'], reserve: 'churchill', status: 'quiet', last: '16 days ago', next: 'Not booked', move: 'Run the smallest version of the conversation that would still count, once.', line: '', lineNote: "None yet. Jennifer's first session is booked.", up19: { label: 'Wed 21 Oct · Leadership offsite', sit: 'E2' },
      events: [{ day: 14, icon: 'ph-chat-circle', title: 'You wrote', detail: "I haven't heard from you in a while. Fifteen minutes this week?" }] }
  };

  ['david', 'priya', 'tom'].forEach(function (id) { members[id].coach = 'jim'; });
  var storyByHero = {}; stories.forEach(function (s) { (storyByHero[s.hero] = storyByHero[s.hero] || []).push(s); });
  function libOf(hid) {
    var L = LIB[hid] || [0, []], own = storyByHero[hid] || [];
    var cov = L[1].slice(); own.forEach(function (s) { s.keys.forEach(function (k) { var si = sitByKey[k]; if (si && si.id && cov.indexOf(si.id) < 0) cov.push(si.id); }); });
    return { n: Math.max(L[0], own.length), cov: cov, verified: own.filter(function (s) { return s.verified; }).length };
  }
  var intIcon = {};
  window.CPD = {
    dow: dow, lab: lab, long: long,
    heroes: heroes, hero: hero, stories: stories, story: story, works: works, work: work, sits: sits, sit: sit, sitByKey: sitByKey, members: members, coaches: coaches, pools: pools, libOf: libOf, pew: PEW, intIcon: intIcon,
    personas: ['maya', 'sarah', 'michael'],
    order: ['sarah', 'maya', 'michael', 'david', 'priya', 'tom'],
    r1: [['obama', 'aretha'], ['churchill', 'jackie'], ['oprah', 'ali'], ['golda', 'yoyoma'], ['jfk', 'stevie'], ['huffington', 'biles'], ['michelle', 'bjk'], ['mlk', 'nina']],
    sample: ['obama', 'jackie', 'ali', 'golda', 'stevie', 'biles', 'michelle', 'mlk', 'obama', 'ali', 'stevie', 'michelle'],
    fitLines: {
      obama: "His record is full of rivals kept close. That's the room you're walking into.",
      stevie: 'His stories are mostly about owning your work. Useful for some of your weeks, not all.',
      ali: 'Ali won by saying it first and loudest. Your goal needs a quieter approach in the room. Jim will talk to you about how to use him.'
    },
    walkOver: {
      'every-act-is-a-message|obama': { text: 'say the hardest part of the reorg yourself, before anyone else frames it.', story: 'st-obama-2008-more-perfect-union' },
      'every-act-is-a-message|stevie': { text: 'put your name on the plan. You built it.', story: 'st-stevie-wonder-1971-motown' }
    },
    ask1: "I'm announcing the reorg to the whole group on Thursday and Dan wanted my job.",
    goalChips: ['Be the person they call before the decision, not after it.', 'Running the group a year from now, and the obvious choice for the next one.', "The partner clients ask for by name, not the firm's name on the door.", 'Leading the change, not being changed by it.'],
    ints: [['Music', 'music-notes'], ['Sport', 'basketball'], ['Film & TV', 'film-strip'], ['Fashion & design', 't-shirt'], ['Business', 'briefcase'], ['Politics & public life', 'bank'], ['Science & invention', 'flask'], ['Art', 'palette'], ['Books & writing', 'book-open'], ['Food', 'fork-knife'], ['Exploration', 'compass'], ['Faith & activism', 'hand-heart'], ['Creators', 'video-camera']],
    slots: ['Tue 20 Oct, 10:00', 'Tue 20 Oct, 16:00', 'Wed 21 Oct, 09:30'],
    clock: [
      { n: 1, day: 6, hm: '09:00', role: 'member', label: 'Sarah opens the app' },
      { n: 2, day: 6, hm: '09:02', role: 'member', label: 'The bracket' },
      { n: 3, day: 6, hm: '09:05', role: 'member', label: 'Final four and fit check' },
      { n: 4, day: 7, hm: '08:30', role: 'coach', label: 'Roster and hero fit' },
      { n: 5, day: 7, hm: '10:00', role: 'coach', label: 'Publish Move 1' },
      { n: 6, day: 12, hm: '07:30', role: 'member', label: 'Monday card' },
      { n: 7, day: 15, hm: '13:00', role: 'member', label: 'In an hour: run sheet' },
      { n: 8, day: 16, hm: '16:00', role: 'member', label: 'Debrief' },
      { n: 9, day: 21, hm: '21:40', role: 'member', label: 'Ask: the reorg' },
      { n: 10, day: 18, hm: '12:00', role: 'coach', label: 'Review queue' },
      { n: 11, day: 20, hm: '09:45', role: 'coach', label: 'Check-in prep' }
    ],
    msgs: {
      sarah: [
        { id: 's1', from: 'coach', kind: 'text', body: "Thanks for your three, Sarah. I've read your goal. Obama's record is full of rivals kept close; we'll start there.", day: 7, at: 'Wed 7 Oct, 11:20' },
        { id: 's2', from: 'coach', kind: 'voice', dur: '0:42', day: 8, at: 'Thu 8 Oct, 08:05' },
        { id: 's3', from: 'coach', kind: 'checkin', day: 8, at: 'Thu 8 Oct, 08:06' }
      ],
      david: [{ id: 'd1', from: 'member', kind: 'text', body: 'Ardent moved the pitch to Tuesday.', day: 12, at: 'Mon 12 Oct, 18:02' }],
      priya: [{ id: 'p1', from: 'coach', kind: 'text', body: 'Nine marks, all acted. This week, try saying the line out loud once.', day: 16, at: 'Fri 16 Oct, 17:30' }],
      tom: [{ id: 't1', from: 'coach', kind: 'text', body: "I haven't heard from you in a while. Fifteen minutes this week?", day: 14, at: 'Wed 14 Oct, 09:10' }],
      maya: [
        { id: 'ma1', from: 'coach', kind: 'text', body: "Thanks for your three, Maya. None of them has a story in the record yet, so your first weeks will come from people close to them. We'll fix that together.", day: 7, at: 'Wed 7 Oct, 11:20' },
        { id: 'ma2', from: 'coach', kind: 'checkin', day: 8, at: 'Thu 8 Oct, 08:06' }
      ],
      michael: [
        { id: 'mi1', from: 'coach', kind: 'text', body: "Thanks for your three, Michael. We'll talk about how to use Ali when we meet. He's for the weeks you stand on your own name, not for the pitch itself.", day: 7, at: 'Wed 7 Oct, 11:20' },
        { id: 'mi2', from: 'coach', kind: 'checkin', day: 8, at: 'Thu 8 Oct, 08:06' }
      ]
    },
    talk: ['Dan took the account on Thursday. What did the room do?', 'The reorg announcement: which part will she be tempted to explain?', 'Dawn Staley has no stories yet. Keep her, or point Sarah to someone with a deeper record?'],
    tests: ['It has a room', 'A verb somebody could watch', 'Runs inside two minutes', 'Goes with the grain', 'Has a named first failure', 'Survives being repeated, word for word, to the person it concerns'],
    bars: [6, 10, 14, 9, 18, 12, 7, 16, 20, 11, 8, 15, 19, 10, 6, 13, 17, 9, 12, 18, 8, 14, 10, 6, 12, 16, 9, 7]
  };
  window.CPD.ints.forEach(function (r) { intIcon[r[0]] = r[1]; });
})();
