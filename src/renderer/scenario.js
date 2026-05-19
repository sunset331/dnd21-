// ═══════════════════════════════════════════════════════════
//  scenario.js — Modular DND event composition engine
//  Actions × Locations × Targets → Event
//  Event + Tier → Causal Outcome
// ═══════════════════════════════════════════════════════════

function classifyTier(v) { if(v===1)return'CRIT_FAIL';if(v<=9)return'FAIL';if(v<=19)return'SUCCESS';return'CRIT_SUCCESS'; }
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function tierLabel(t){switch(t){case'CRIT_FAIL':return'大失败';case'FAIL':return'失败';case'SUCCESS':return'成功';case'CRIT_SUCCESS':return'大成功';default:return'';}}
function tierEmoji(t){switch(t){case'CRIT_FAIL':return'💀';case'FAIL':return'😐';case'SUCCESS':return'✨';case'CRIT_SUCCESS':return'👑';default:return'🎲';}}

// ═══════════════════════════════════════════════════════════
//  COMPONENT POOLS — 35 + 35 + 35 + 25 = 130 base components
// ═══════════════════════════════════════════════════════════

const ACTIONS = [
  {t:'试图偷走',      tags:['stealth','crime'],         r:'common'},
  {t:'悄悄潜入',      tags:['stealth','dungeon'],        r:'common'},
  {t:'向……发起决斗',  tags:['combat','honor'],           r:'common'},
  {t:'画阵召唤',      tags:['magic','summon'],           r:'uncommon'},
  {t:'试图说服',      tags:['social','diplomacy'],       r:'common'},
  {t:'用假名混入',    tags:['stealth','social'],         r:'common'},
  {t:'抡起酒瓶砸向',  tags:['combat','tavern'],          r:'common'},
  {t:'念了一段半生不熟的咒语对着', tags:['magic','curse'],r:'uncommon'},
  {t:'掏出鲁特琴对着……深情演唱',  tags:['social','bard'], r:'uncommon'},
  {t:'掏出三枚铜板试图贿赂',      tags:['social','crime'],r:'common'},
  {t:'喝下闪着绿光的药水后冲向',  tags:['magic','potion'],r:'uncommon'},
  {t:'用匕首撬开',    tags:['stealth','crime'],         r:'common'},
  {t:'对……破口大骂',  tags:['social','combat'],          r:'common'},
  {t:'跪下来虔诚祈祷', tags:['holy','social'],           r:'common'},
  {t:'掏出放大镜检查', tags:['stealth','investigate'],   r:'common'},
  {t:'闭上眼睛纵身一跃扑向',       tags:['combat','action'],r:'uncommon'},
  {t:'用一根羽毛试图挠痒',         tags:['social','comedy'],r:'uncommon'},
  {t:'朝……扔了一块发霉奶酪',       tags:['combat','comedy'],r:'common'},
  {t:'对着……吹了一声口哨',         tags:['social','stealth'],r:'common'},
  {t:'以极其浮夸的礼仪问候',       tags:['social','noble'],r:'uncommon'},
  {t:'掏出祖传的护身符对准',       tags:['magic','holy'],r:'uncommon'},
  {t:'对……比了一个侮辱性的手势',   tags:['social','crime'],r:'common'},
  {t:'穿上隐形斗篷溜向',           tags:['stealth','magic'],r:'rare'},
  {t:'掏出火药桶点燃引线丢向',     tags:['combat','chaos'],r:'uncommon'},
  {t:'伪装成吟游诗人混入',         tags:['stealth','bard'],r:'uncommon'},
  {t:'用半兽人语大声宣布自己是新酋长，对着', tags:['social','orc'],r:'rare'},
  {t:'举起一面破盾牌慢慢靠近',     tags:['combat','stealth'],r:'common'},
  {t:'画了个歪歪扭扭的传送阵跳向', tags:['magic','chaos'],r:'uncommon'},
  {t:'在倾盆大雨中踉跄着摸向',     tags:['weather','stealth'],r:'uncommon'},
  {t:'对天空射了一发信号箭然后跑向', tags:['combat','weather'],r:'uncommon'},
  {t:'拿起一袋面粉伪装成幽灵飘向', tags:['stealth','comedy'],r:'uncommon'},
  {t:'对……说了一句暗精灵情诗',     tags:['social','dark_elf'],r:'rare'},
  {t:'掏出死灵法术书试图唤醒',     tags:['magic','undead'],r:'rare'},
  {t:'用矮人语大吼"为了岩石与麦酒"冲向', tags:['combat','dwarf'],r:'uncommon'},
  {t:'假装自己是税务官走向',       tags:['social','crime'],r:'uncommon'},
  {t:'掏出一只活蹦乱跳的公鸡献给', tags:['social','comedy'],r:'uncommon'},
];

const LOCATIONS = [
  {t:'矮人酒馆的吧台前',              tags:['tavern','dwarf'],     r:'common'},
  {t:'暗精灵地下城的蛛网祭坛旁',      tags:['dungeon','dark_elf'], r:'uncommon'},
  {t:'半兽人战帮的篝火堆边',          tags:['camp','orc'],         r:'common'},
  {t:'被诅咒教堂的忏悔室里',          tags:['curse','holy'],       r:'uncommon'},
  {t:'暴风雨中摇摇欲坠的哨塔顶层',    tags:['weather','ruins'],    r:'uncommon'},
  {t:'龙巢入口的骨骸堆旁',            tags:['dragon','danger'],    r:'rare'},
  {t:'哥布林洞穴深处的蘑菇农场',      tags:['goblin','dungeon'],   r:'common'},
  {t:'废弃矮人矿坑的升降梯边',        tags:['dwarf','dungeon'],    r:'common'},
  {t:'亡灵战场中央的焦土上',          tags:['undead','weather'],    r:'rare'},
  {t:'妖精森林里发光的蘑菇圈内',      tags:['fey','magic'],        r:'uncommon'},
  {t:'大雪纷飞中的十字路口',          tags:['weather','travel'],    r:'common'},
  {t:'冒险者公会的悬赏板下',          tags:['social','guild'],      r:'common'},
  {t:'吸血鬼伯爵的城堡宴会厅',        tags:['undead','noble'],      r:'rare'},
  {t:'沙漠商队营地旁的破旧帐篷里',    tags:['travel','weather'],    r:'common'},
  {t:'地精黑市的地下拍卖场',          tags:['crime','goblin'],      r:'uncommon'},
  {t:'被藤蔓覆盖的古代法师塔入口',    tags:['magic','ruins'],       r:'uncommon'},
  {t:'雾蒙蒙的沼泽中央孤岛上',        tags:['weather','danger'],    r:'uncommon'},
  {t:'暗精灵走私船的下层货舱',        tags:['dark_elf','crime'],    r:'rare'},
  {t:'矮人铁匠铺的淬火池旁',          tags:['dwarf','equipment'],   r:'common'},
  {t:'兽人军阀的帐篷王座前',          tags:['orc','noble'],         r:'uncommon'},
  {t:'冰封山脊上的远古龙墓入口',      tags:['dragon','weather'],    r:'legendary'},
  {t:'酒馆地下非法斗兽场的围栏边',    tags:['tavern','crime'],      r:'uncommon'},
  {t:'传奇幽灵海盗船的甲板上',        tags:['undead','legendary'],  r:'legendary'},
  {t:'矮人要塞大门的吊桥中央',        tags:['dwarf','combat'],      r:'uncommon'},
  {t:'暗月森林深处不冻的泉水边',      tags:['fey','dark_elf'],      r:'uncommon'},
  {t:'被遗忘的矮人图书馆废墟',        tags:['dwarf','ruins'],       r:'rare'},
  {t:'雷鸣崖顶的鹰巢平台上',          tags:['weather','danger'],    r:'uncommon'},
  {t:'鼠人地下王国的奶酪神庙前',      tags:['dungeon','comedy'],    r:'uncommon'},
  {t:'血月之下的巨石阵中央',          tags:['curse','weather'],     r:'rare'},
  {t:'半兽人营地旁的角斗训练场',      tags:['orc','combat'],        r:'common'},
  {t:'矮人与暗精灵边境的废弃哨站',    tags:['dwarf','dark_elf'],    r:'rare'},
  {t:'被诅咒的古老剧院舞台上',        tags:['curse','undead'],      r:'uncommon'},
  {t:'温泉瀑布后面的隐秘石窟',        tags:['magic','travel'],      r:'uncommon'},
  {t:'海崖边被海怪触手缠绕的灯塔',    tags:['weather','danger'],    r:'rare'},
  {t:'沙尘暴中若隐若现的幻影绿洲',    tags:['weather','magic'],     r:'uncommon'},
];

const TARGETS = [
  {t:'一把会低语的暗精灵匕首',        tags:['curse','dark_elf','weapon'],     r:'uncommon'},
  {t:'被诅咒的烤鸡',                  tags:['curse','comedy'],                 r:'common'},
  {t:'半兽人酋长的传代战鼓',          tags:['orc','artifact'],                 r:'rare'},
  {t:'一颗正在孵化的龙蛋',            tags:['dragon','danger'],                r:'rare'},
  {t:'会自己倒酒的魔法酒壶',          tags:['magic','tavern'],                 r:'uncommon'},
  {t:'一只正在打鼾的传奇幽灵',        tags:['undead','legendary'],             r:'legendary'},
  {t:'暗精灵走私的上古毒药配方',      tags:['dark_elf','potion'],              r:'uncommon'},
  {t:'哥布林王的纸皇冠',              tags:['goblin','artifact'],              r:'common'},
  {t:'一把插在石头里正在哼歌的剑',    tags:['magic','weapon'],                 r:'uncommon'},
  {t:'刻着"不要打开"的华丽棺材',      tags:['undead','curse'],                 r:'uncommon'},
  {t:'矮人铁匠大师的遗作锤子',        tags:['dwarf','artifact'],               r:'rare'},
  {t:'一本封印着愤怒诗灵的诗集',      tags:['curse','bard'],                   r:'uncommon'},
  {t:'能够控制天气的水晶宝珠',        tags:['weather','magic'],                r:'legendary'},
  {t:'一个被铁链锁住的宝箱',          tags:['treasure','danger'],              r:'common'},
  {t:'一枚会吸收月光的黑珍珠',        tags:['magic','dark_elf'],               r:'rare'},
  {t:'被遗忘的矮人王室族谱',          tags:['dwarf','artifact'],               r:'rare'},
  {t:'一袋永不过期的冒险者口粮',      tags:['magic','comedy'],                 r:'common'},
  {t:'半兽人萨满的图腾面具',          tags:['orc','magic'],                    r:'uncommon'},
  {t:'暗夜精灵流亡公主的日记',        tags:['dark_elf','noble'],               r:'rare'},
  {t:'一只会说反话的魔法鹦鹉',        tags:['magic','comedy'],                 r:'uncommon'},
  {t:'矮人酿造的"末日麦酒"（酒精度90%）',tags:['dwarf','tavern'],             r:'uncommon'},
  {t:'一面能映出前世模样的铜镜',      tags:['magic','curse'],                  r:'uncommon'},
  {t:'被诅咒的雪貂标本',              tags:['curse','comedy'],                 r:'uncommon'},
  {t:'暗精灵刺客公会的成员徽章',      tags:['dark_elf','crime'],               r:'rare'},
  {t:'一瓶标签写着"管用"的紫色药水',  tags:['potion','magic'],                 r:'common'},
  {t:'一副会自动洗牌的扑克牌',        tags:['magic','tavern'],                 r:'common'},
  {t:'地牢领主的私房菜谱',            tags:['dungeon','comedy'],               r:'uncommon'},
  {t:'一枚被半兽人战帮通缉的戒指',    tags:['orc','crime'],                    r:'uncommon'},
  {t:'一片散发着圣光的天使羽毛',      tags:['holy','magic'],                   r:'rare'},
  {t:'被暗影污染的精灵古树种子',      tags:['dark_elf','curse'],               r:'rare'},
  {t:'一个装满了各地泥土的小瓶子——每个土样都来自不同的战场', tags:['undead','artifact'], r:'legendary'},
  {t:'矮人发明的自动打架机（已损坏）',tags:['dwarf','comedy'],                 r:'uncommon'},
  {t:'一匹被诅咒的旋转木马（活的）',  tags:['curse','comedy'],                 r:'uncommon'},
  {t:'一本记录了所有来过这个酒馆的冒险者名字的签到簿', tags:['tavern','artifact'], r:'common'},
  {t:'挂在墙上的半兽人拳王的金腰带',  tags:['orc','combat'],                   r:'uncommon'},
];

const COMPLICATIONS = [
  {t:'突然雷暴降临，一道闪电劈在脚边',        tags:['weather','disaster'],      r:'uncommon'},
  {t:'暗精灵巡逻队从阴影中无声浮现',            tags:['dark_elf','combat'],      r:'uncommon'},
  {t:'那个幽灵醒了过来，开始讲它三百年前的死因',tags:['undead','social'],       r:'rare'},
  {t:'酒馆里突然爆发了一场与事件无关的群架',    tags:['tavern','combat'],       r:'common'},
  {t:'地面开始剧烈震动——不是地震，是下面有头巨兽在翻身', tags:['danger','chaos'], r:'rare'},
  {t:'一个喝醉的矮人误以为你是他失散多年的亲戚，死死抱住你不放', tags:['dwarf','comedy'], r:'common'},
  {t:'一阵刺骨的寒风吹过，所有火焰同时熄灭',    tags:['weather','magic'],        r:'uncommon'},
  {t:'半兽人战鼓声从远处传来，越来越近',        tags:['orc','combat'],           r:'common'},
  {t:'空气中弥漫起一股甜腻的毒雾——暗精灵的看家本领', tags:['dark_elf','danger'], r:'uncommon'},
  {t:'一头路过的龙在头顶盘旋，似乎在评估状况',  tags:['dragon','danger'],        r:'rare'},
  {t:'大雾突然吞噬了所有能见度，伸手不见五指',  tags:['weather','stealth'],      r:'common'},
  {t:'突然冒出了十来个举着火把的哥布林，它们显然在开派对', tags:['goblin','comedy'], r:'common'},
  {t:'一个浑身是伤的NPC跌跌撞撞冲进来，喊着与当前事件完全无关的求救', tags:['social','comedy'], r:'common'},
  {t:'地面裂开，一群地底鼹鼠窜了出来，场面一度非常混乱', tags:['chaos','comedy'], r:'uncommon'},
  {t:'月亮突然变成了血红色——有人触发了古老的月亮诅咒', tags:['curse','weather'], r:'rare'},
  {t:'一个披着斗篷的神秘人无声地站到了你身后——他已经站了很久了', tags:['dark_elf','stealth'], r:'uncommon'},
  {t:'暴风雪毫无征兆地降临——现在是七月',       tags:['weather','chaos'],         r:'rare'},
  {t:'一群迁徙的巨型蝴蝶掠过，翅膀的鳞粉有轻微致幻效果', tags:['magic','comedy'], r:'uncommon'},
  {t:'附近传来一声令人毛骨悚然的狼嚎——不是狼，是暗精灵的侦查讯号', tags:['dark_elf','danger'], r:'uncommon'},
  {t:'所有金属物品突然开始发光——矮人矿坑附近传来的魔法脉冲', tags:['dwarf','magic'], r:'uncommon'},
  {t:'脚下的影子突然开始做出和你不一样的动作',    tags:['curse','magic'],          r:'rare'},
  {t:'不知从哪飘来一段凄美的管风琴声——它自己弹的', tags:['undead','magic'],       r:'uncommon'},
  {t:'一个自称是时间旅行者的家伙从光柱中跌出来——他显然走错了时代', tags:['magic','comedy'], r:'rare'},
  {t:'沙尘暴的前锋已经到达——你只有几分钟时间',   tags:['weather','danger'],       r:'uncommon'},
  {t:'一个矮人工程队从隧道里钻出来——显然他们挖错了方向', tags:['dwarf','comedy'],  r:'common'},
];

// ═══════════════════════════════════════════════════════════
//  OUTCOME TEMPLATES — tier-specific, fill with component data
// ═══════════════════════════════════════════════════════════

const OUTCOME_TEMPLATES = {
  CRIT_FAIL: [
    (a,l,t,c)=>`你${a.t}${l.t}${t.t}。${c?c.t+'。':''}一切朝着最坏的方向狂奔。${pick(PUNCH_CRIT_FAIL)}`,
    (a,l,t,c)=>`完全搞砸了。你不但没能${a.t.replace(/^试图/,'')}${t.t}，反而触发了一连串连锁灾难。${l.t.split('的')[0]}现在冒起了黑烟。${pick(PUNCH_CRIT_FAIL)}`,
    (a,l,t,c)=>`${t.t}比你想象的危险得多。${c?'外加'+c.t+'，':''}你现在的处境只能用"极具创意的不幸"来形容。${pick(PUNCH_CRIT_FAIL)}`,
    (a,l,t,c)=>`你搞错了目标——${t.t}发出了一声巨响（或惨笑），${l.t.split('的')[0]}的所有人都转过来看着你。${pick(PUNCH_CRIT_FAIL)}`,
    (a,l,t,c)=>`那是一个陷阱。${t.t}上面竟然有暗精灵的反盗印记。${c?c.t+'同时发生。':''}你现在需要一个新的计划、一套新装备，可能还需要一个新身份。`,
    (a,l,t,c)=>`灾难级失败。${l.t.split('的')[0]}的生物们停止了手头的事，安静地看着你——那种沉默比任何嘲笑都更伤人。${pick(PUNCH_CRIT_FAIL)}`,
  ],
  FAIL: [
    (a,l,t,c)=>`你${a.t}${l.t}${t.t}。效果平平，不值一提。${c?'更糟的是，'+c.t.substr(0,15)+'...':''}你没成功但也没团灭，这在冒险者世界里算半个好消息。`,
    (a,l,t,c)=>`尝试了，但没成。${t.t}纹丝不动，${l.t.split('的')[0]}的旁观者礼貌地移开了视线。${pick(PUNCH_FAIL)}`,
    (a,l,t,c)=>`你差一点就成功了。真的只差一点。大概差了一个传奇法术的距离，但确实是"一点"。${pick(PUNCH_FAIL)}`,
    (a,l,t,c)=>`门没开，宝没到手，但至少你还活着。你记住了这个教训：下次不要在${l.t.split('的')[0]}对${t.t}做这种事。`,
    (a,l,t,c)=>`不成功，但也不丢脸。${c?c.t.substr(0,18)+'——但你没被波及。':''}你把这次经历默默地归入"不值的尝试"清单。`,
  ],
  SUCCESS: [
    (a,l,t,c)=>`成了！你${a.t}${l.t}${t.t}，干净利落地拿下了。${l.t.split('的')[0]}里有人吹了声口哨表示赞赏。${pick(PUNCH_SUCCESS)}`,
    (a,l,t,c)=>`完美执行。你带着${t.t}成功脱离，${c?'虽然'+c.t.substr(0,18)+'——但没妨碍你。':''}今天是个好日子。`,
    (a,l,t,c)=>`你做到了——用实力加上一点运气。${l.t.split('的')[0]}的围观者中有人鼓起掌来，虽然掌声稀稀拉拉，但在你心里它很响。`,
    (a,l,t,c)=>`成功了！${t.t}现在归你处置。你获得了它的力量、它的价值、或者至少——一个可以吹至少三次的故事。`,
    (a,l,t,c)=>`你稳健地完成了目标。离开时，${l.t.split('的')[0]}的老板递给你一杯免费饮料。这可能就是成功的味道。`,
  ],
  CRIT_SUCCESS: [
    (a,l,t,c)=>`传奇般的成功！你${a.t}${l.t}${t.t}，整个过程行云流水。${l.t.split('的')[0]}的人都记住了今天。${pick(PUNCH_CRIT_SUCCESS)}`,
    (a,l,t,c)=>`你不仅做到了，而且做得极其华丽。${t.t}迸发出一阵金光——不知哪来的金光——你被短暂地加冕为"${l.t.split('的')[0]}的今日最强者"。`,
    (a,l,t,c)=>`满分操作！连${c?c.t.replace(/突然|了/g,'')+'都无法阻止你——':''}${l.t.split('的')[0]}的吟游诗人掏出小本子开始给你编歌。`,
    (a,l,t,c)=>`这一刻你超越了凡人的极限。${t.t}被你完美征服，你获得了它的全部价值——外加一个闪闪发亮的稀有称号。`,
    (a,l,t,c)=>`命运的齿轮完美咬合。你以传奇级的优雅完成了这次冒险。${l.t.split('的')[0]}的墙上会被刻上你的名字——虽然字迹有点歪，但它就是你的名字。`,
  ],
};

// ─── Punchline pools ───
const PUNCH_CRIT_FAIL = [
  '今天不适合冒险。也许该考虑回去继承家里的面包店。','地牢深处的骷髅发出了咔咔的嘲笑声。','DM露出了一个意味深长的微笑。那个微笑里没有好事。','你失去了几枚金币、一份尊严、和一张没来得及用的治疗卷轴。',
  '暗精灵在一旁窃笑——他们什么都没做，但他们的存在本身就是一种嘲讽。','你现在的处境，用一个词概括就是：额外伤害。','半兽人路过看了一眼，然后移开了视线——他们觉得这场面太惨了。',
];
const PUNCH_FAIL = [
  '下次一定。真的。','不是最糟的——但离最糟也就隔了一层薄纸。','你获得了宝贵的经验值。具体来说，就是"下次别这么干"的经验。','至少没人死——如果你把自尊不算在内的话。',
  '周围有半兽人观众发出了微弱的"啧"声。','你默默地把这件事标记为"战术性不成功"。',
];
const PUNCH_SUCCESS = [
  '这值得在你的冒险日志里占一行。','幸运女神今天朝你这边瞅了一眼。','你获得了1.5点自信值。','旁边的新手冒险者投来了崇拜的目光。',
  '暗精灵路过时微微点头——这是他们能给出的最高评价。','如果每次冒险都有这个水平，你大概能活到退休。',
];
const PUNCH_CRIT_SUCCESS = [
  '就是这种感觉。这就是你为什么喜欢当冒险者。','如果你有个粉丝后援会，他们现在应该正在尖叫。','今夜无人入睡——所有人都在讨论你刚才的操作。','骰子之神今天显然站在你这边。别忘了还愿。',
  '连暗精灵都鼓了掌——虽然只有两下，但在暗精灵文化里这相当于起立欢呼。','半兽人把你举过了头顶。你不太确定这是庆祝还是威胁，但你决定享受它。',
];

// ═══════════════════════════════════════════════════════════
//  COMPOSITION ENGINE
// ═══════════════════════════════════════════════════════════

function weightedPick(pool, preferredTags) {
  if (!preferredTags || preferredTags.length===0) return pick(pool);
  // 50% chance: pick from tag-matched subset; 50%: pick from full pool
  if (Math.random() < 0.5) {
    const subset = pool.filter(e => e.tags && e.tags.some(t => preferredTags.includes(t)));
    if (subset.length > 0) return pick(subset);
  }
  return pick(pool);
}

function generateEvent(activeStatuses) {
  activeStatuses = activeStatuses || [];
  // Map status → preferred tags
  const statusTagMap = { drunk:'tavern', goblin_smell:'goblin', dungeon_wanted:'dungeon', cursed:'curse', lucky:'treasure' };
  const preferredTags = [];
  for (const s of activeStatuses) { if (statusTagMap[s.id]) preferredTags.push(statusTagMap[s.id]); }

  const action = weightedPick(ACTIONS, preferredTags);
  const location = weightedPick(LOCATIONS, preferredTags);
  const target = weightedPick(TARGETS, preferredTags);
  // 20% chance to add a complication
  const complication = Math.random() < 0.2 ? weightedPick(COMPLICATIONS, preferredTags) : null;

  const text = complication
    ? `你${action.t}${location.t}${target.t}。然而——${complication.t}`
    : `你${action.t}${location.t}${target.t}。`;

  // Combined tags from all components
  const allTags = [...new Set([...action.tags, ...location.tags, ...target.tags, ...(complication?complication.tags:[])])];
  // Combined rarity: highest wins
  const rarityOrder = ['common','uncommon','rare','legendary'];
  const maxR = Math.max(...[action,location,target,complication].filter(Boolean).map(c=>rarityOrder.indexOf(c.r)));

  return {
    text,
    components: { action, location, target, complication },
    tags: allTags,
    rarity: rarityOrder[maxR],
  };
}

function generateOutcome(eventComponents, tier) {
  const { action, location, target, complication } = eventComponents || {};
  if (!action || !location || !target) {
    return { outcome: '命运给出了一个模糊的回答。', tierText: tierLabel(tier) };
  }
  const templates = OUTCOME_TEMPLATES[tier] || OUTCOME_TEMPLATES.FAIL;
  const tmpl = pick(templates);
  const outcomeText = tmpl(action, location, target, complication);
  return { outcome: outcomeText, tierText: tierLabel(tier) };
}

// ═══════════════════════════════════════════════════════════
//  EVENT CHAIN
// ═══════════════════════════════════════════════════════════

const CHAIN_PREFIXES = [
  '上次的事还没完——','命运再次找上门来：','旧账未清，又有新麻烦：','你正打算休息，但','因果如影随形：','上次的余波荡漾至今——',
];
const CHAIN_CONSEQUENCES = [
  '那个事件的后续正在发酵。','相关的NPC突然出现在你面前。','留下了一张写着"未完待续"的字条。','有人送来了账单——和一张感谢卡。同一件事，不同的结果。','消息传开后，新的机会找上了你。','你发现上次事件的一个小细节——它其实不是巧合。',
];

function generateChainEvent(previousEventText) {
  const short = previousEventText.length>30?previousEventText.substring(0,30)+'..."':previousEventText;
  const text = `${pick(CHAIN_PREFIXES)}${pick(CHAIN_CONSEQUENCES)}（前情："${short}）`;
  const dummy = {t:'面对上次的后果',tags:[],r:'common'};
  return { text, components:{action:dummy,location:dummy,target:dummy,complication:null}, tags:[], rarity:'common', isChain:true };
}

// ═══════════════════════════════════════════════════════════
//  STATUS SYSTEM
// ═══════════════════════════════════════════════════════════

const STATUS_POOL = {
  drunk:{id:'drunk',name:'醉酒',desc:'酒馆事件概率↑',icon:'🍺',duration:3},
  cursed:{id:'cursed',name:'被诅咒',desc:'大失败概率略微提升',icon:'💀',duration:5},
  lucky:{id:'lucky',name:'幸运',desc:'大成功概率略微提高',icon:'🍀',duration:2},
  goblin_smell:{id:'goblin_smell',name:'哥布林气味',desc:'哥布林相关事件增加',icon:'👃',duration:4},
  dungeon_wanted:{id:'dungeon_wanted',name:'地牢通缉',desc:'卫兵相关事件增加',icon:'📜',duration:4},
  holy_shield:{id:'holy_shield',name:'圣光庇护',desc:'下一次失败可重投',icon:'🛡️',duration:1},
};

function pickRandomStatus(){
  const w=[{id:'drunk',w:20},{id:'cursed',w:15},{id:'lucky',w:10},{id:'goblin_smell',w:18},{id:'dungeon_wanted',w:15},{id:'holy_shield',w:8}];
  const t=w.reduce((s,x)=>s+x.w,0);let r=Math.random()*t;
  for(const x of w){r-=x.w;if(r<=0)return{...STATUS_POOL[x.id]};}return{...STATUS_POOL.drunk};
}

// ─── Exports ───
if(typeof module!=='undefined'&&module.exports){module.exports={classifyTier,tierLabel,tierEmoji,generateEvent,generateOutcome,pickRandomStatus,STATUS_POOL,generateChainEvent,ACTIONS,LOCATIONS,TARGETS,COMPLICATIONS};}
