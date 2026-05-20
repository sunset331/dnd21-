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

function generateEvent(activeStatuses, worldState) {
  activeStatuses = activeStatuses || [];
  worldState = worldState || {};

  // 30% chance: pick from unlocked chain events if any
  if (worldState.activeThreads && worldState.activeThreads.length > 0 && Math.random() < 0.30) {
    const storyEvent = STORY_EVENTS.find(e => e.id === pick(worldState.activeThreads));
    if (storyEvent) {
      return {
        text: storyEvent.scene,
        components: null,
        tags: storyEvent.tags,
        rarity: storyEvent.rarity || 'uncommon',
        storyId: storyEvent.id,
      };
    }
  }

  // 30% chance: pick a random story event (has effects)
  if (Math.random() < 0.30) {
    const storyEvent = pick(STORY_EVENTS);
    return {
      text: storyEvent.scene,
      components: null,
      tags: storyEvent.tags,
      rarity: storyEvent.rarity || 'uncommon',
      storyId: storyEvent.id,
    };
  }

  // 40%: modular composition engine
  const statusTagMap = { drunk:'tavern', goblin_smell:'goblin', dungeon_wanted:'dungeon', cursed:'curse', lucky:'treasure' };
  const preferredTags = [];
  for (const s of activeStatuses) { if (statusTagMap[s.id]) preferredTags.push(statusTagMap[s.id]); }

  // Also bias by worldState reputation
  if (worldState.reputation) {
    for (const [faction, val] of Object.entries(worldState.reputation)) {
      if (Math.abs(val) >= 30) preferredTags.push(faction);
    }
  }

  const action = weightedPick(ACTIONS, preferredTags);
  const location = weightedPick(LOCATIONS, preferredTags);
  const target = weightedPick(TARGETS, preferredTags);
  const complication = Math.random() < 0.2 ? weightedPick(COMPLICATIONS, preferredTags) : null;

  const text = complication
    ? `你${action.t}${location.t}${target.t}。然而——${complication.t}`
    : `你${action.t}${location.t}${target.t}。`;

  const allTags = [...new Set([...action.tags, ...location.tags, ...target.tags, ...(complication?complication.tags:[])])];
  const rarityOrder = ['common','uncommon','rare','legendary'];
  const maxR = Math.max(...[action,location,target,complication].filter(Boolean).map(c=>rarityOrder.indexOf(c.r)));

  return {
    text,
    components: { action, location, target, complication },
    tags: allTags,
    rarity: rarityOrder[maxR],
  };
}

function generateOutcome(eventComponents, tier, storyId) {
  // Story event: use its predefined outcomes
  if (storyId) {
    const storyEvent = STORY_EVENTS.find(e => e.id === storyId);
    if (storyEvent) {
      const outcome = storyEvent.outcomes[tier] || storyEvent.outcomes.FAIL;
      return { outcome: outcome.text, tierText: tierLabel(tier), effects: outcome.effects || null };
    }
  }
  // Modular composition: use template engine
  const { action, location, target, complication } = eventComponents || {};
  if (!action || !location || !target) {
    return { outcome: '命运给出了一个模糊的回答。', tierText: tierLabel(tier), effects: null };
  }
  const templates = OUTCOME_TEMPLATES[tier] || OUTCOME_TEMPLATES.FAIL;
  const tmpl = pick(templates);
  const outcomeText = tmpl(action, location, target, complication);
  return { outcome: outcomeText, tierText: tierLabel(tier), effects: null };
}

// ═══════════════════════════════════════════════════════════
//  STORY EVENTS — 25 events with world consequences
// ═══════════════════════════════════════════════════════════

const STORY_EVENTS = [
  { id:'dragon_egg_heist', rarity:'rare', tags:['dragon','stealth','danger'],
    scene:'龙巢深处，一枚泛着微光的龙蛋正静静躺在金币堆上。母龙在洞口打盹——你只有这一次机会。',
    outcomes:{
      CRIT_FAIL:{ text:'龙蛋在你怀里裂开了。一只湿漉漉的幼龙探出头，第一眼看见的就是你——它发出了一声能让方圆百里所有成年龙定位的尖叫。母龙醒了。', effects:{ addStatus:'wanted_by_dragons', flags:{dragon_imprint_fail:true}, reputation:{dragons:-50, adventurers_guild:-10}, unlockEvents:['angry_dragon_mother','hunted_by_flight'] }},
      FAIL:{ text:'你没能带走龙蛋，但母龙醒了——她在你身上喷了一道魔法标记。"我会记住你的气味，"她的眼神说。你逃出了洞穴，后背发凉。', effects:{ flags:{dragon_marked:true}, reputation:{dragons:-15}, unlockEvents:['dragon_grudge','hunter_mistakes_you'] }},
      SUCCESS:{ text:'你抱着龙蛋在母龙醒来前溜出了洞穴。龙蛋在你怀里温暖而沉重。现在你拥有一枚龙蛋——以及随之而来的一切麻烦。', effects:{ inventory:['dragon_egg'], flags:{stole_egg:true}, reputation:{dragons:-30, black_market:20}, unlockEvents:['black_market_egg_deal','egg_hatching_event'] }},
      CRIT_SUCCESS:{ text:'龙蛋在你手中发出一道柔和的脉冲——它认主了。母龙在洞口睁开一只眼，看着你——然后重新闭上了。她允许了。你带着这枚与你灵魂绑定的龙蛋走出洞穴，晨光照在你和它身上。', effects:{ inventory:['bonded_dragon_egg'], flags:{stole_egg:true, dragon_blessed:true}, reputation:{dragons:25, adventurers_guild:30}, unlockEvents:['hatch_a_companion','dragon_ally_quest'] }},
    },
  },
  { id:'cursed_treasure_room', rarity:'uncommon', tags:['curse','treasure','dungeon'],
    scene:'推开暗门，一间堆满金币的密室出现了。但金币上全都刻着同一个名字——不是你。角落的石碑写着："拿走一文，永世为仆。"',
    outcomes:{
      CRIT_FAIL:{ text:'你抓了一把金币。它们在你掌心融化成黑色的脓液，渗进了你的皮肤。现在你的右手会自己翻找别人的口袋——而且不听你的指令。', effects:{ addStatus:'cursed', flags:{cursed_hand:true}, reputation:{undead:10}, unlockEvents:['remove_hand_curse','possessed_hand_quest'] }},
      FAIL:{ text:'你礼貌地放下了金币。密室的门在你身后关上了——然后是另一扇，然后是另一扇。你花了三个小时找到出口，出来后发现自己在一座完全陌生的城市。', effects:{ flags:{teleported_randomly:true}, unlockEvents:['lost_in_strange_city'] }},
      SUCCESS:{ text:'你没有碰金币。但你在石碑背面发现了一行小字："有智慧的访客，请到左边第三块砖后领取真正的奖励。"你找到了一枚无害的幸运金币。', effects:{ inventory:['lucky_coin'], flags:{wise_choice:true}, reputation:{undead:5} }},
      CRIT_SUCCESS:{ text:'你对着石碑行了个礼，然后说："我不拿你的钱。但我可以帮你找到这些金币真正的主人。"石碑裂开，里面是一枚闪着金光的徽章——"诚实者的通行证"。持有它，所有亡灵都会对你保持中立。', effects:{ inventory:['undead_truce_badge'], flags:{undead_ally:true}, reputation:{undead:40} }},
    },
  },
  { id:'goblin_king_challenge', rarity:'uncommon', tags:['goblin','combat','social'],
    scene:'哥布林王坐在用破铜烂铁搭成的"王座"上，头上歪歪扭扭的纸皇冠写着"大王"。他看见你，兴奋地拍手："来得正好！我要找一个冠军来——帮我打赢隔壁洞穴的鼠人族！他们偷了我的芝士！"',
    outcomes:{
      CRIT_FAIL:{ text:'你冲进鼠人洞穴，结果发现鼠人族长老是你会说鼠人语的远房亲戚。现在你被哥布林和鼠人两边嫌弃。纸皇冠被撕成两半——一半是你的。', effects:{ addStatus:'goblin_smell', flags:{failed_diplomat:true}, reputation:{goblins:-20, ratfolk:-20}, unlockEvents:['rat_king_revenge','goblin_exile'] }},
      FAIL:{ text:'你打了三个回合，被一块飞来的芝士砸中了脸。哥布林王觉得这是"今天看过的最好笑的战斗"，送你一顶迷你纸皇冠作为参与纪念。', effects:{ inventory:['paper_crown'], flags:{goblin_jester:true}, reputation:{goblins:5} }},
      SUCCESS:{ text:'你用智慧和适度的暴力说服了鼠人族归还芝士。哥布林王大喜，封你为"芝士骑士"，整个哥布林部落对你打开大门。', effects:{ flags:{cheese_knight:true}, reputation:{goblins:30, ratfolk:10}, unlockEvents:['goblin_ally_call','cheese_trade_route'] }},
      CRIT_SUCCESS:{ text:'你组织了一场哥布林-鼠人联合芝士火锅晚宴。两族和解了。哥布林王摘下纸皇冠，给你戴上："从此以后，你是我们的荣誉国王。"纸皇冠在你头上——但这次它不一样了，它微微发光。', effects:{ inventory:['enchanted_paper_crown'], flags:{goblin_king:true}, reputation:{goblins:50, ratfolk:30}, unlockEvents:['goblin_army_help','unite_the_caves'] }},
    },
  },
  { id:'dwarf_masterwork_order', rarity:'uncommon', tags:['dwarf','equipment','social'],
    scene:'矮人铁匠大师放下锤子，擦了擦汗。"我接了一个大单——为国王锻造一把剑。但我少了一块星陨石。如果你能在三天内帮我弄到，这把剑的边角料归你。"',
    outcomes:{
      CRIT_FAIL:{ text:'你在矿坑里挖掘时引发了小塌方——星陨石没找到，你被矮人救援队从矿坑里抬了出来。大师叹了口气："星陨石没了，我的名誉也没了。至少你还活着。"他转身回铺子时，你觉得他更老了。', effects:{ addStatus:'dungeon_wanted', flags:{failed_dwarf_order:true}, reputation:{dwarves:-10, royal_court:-5} }},
      FAIL:{ text:'你找到了星陨石——但它是一块拳头大的小碎片，只够打一把匕首。大师勉强用它做了一把小刀，分给你。"下次努力。"', effects:{ inventory:['meteorite_dagger'], flags:{dwarf_side_job:true} }},
      SUCCESS:{ text:'你在废弃矮人矿井的深处找到了一块拳头大的星陨石。大师用它打了一把传世名剑——剑格上刻了你的名字，剑身的边角料做了一枚戒指给你。', effects:{ inventory:['meteorite_ring'], flags:{dwarf_honor:true}, reputation:{dwarves:25, royal_court:10}, unlockEvents:['royal_knight_quest','dwarf_ally'] }},
      CRIT_SUCCESS:{ text:'你带回的星陨石比大师想象的还大——足够打两把剑。一把给了国王，一把给了你。矮人大师在炉前流下了眼泪："我打了一辈子铁，今天是我最骄傲的一天。"你的剑被命名为"星落"，跟国王那把是姐妹武器。', effects:{ inventory:['starfall_sword'], flags:{dwarf_legend:true}, reputation:{dwarves:60, royal_court:40}, unlockEvents:['king_calls_for_help','dwarf_legend_spreads'] }},
    },
  },
  { id:'dark_elf_smuggler', rarity:'rare', tags:['dark_elf','crime','stealth'],
    scene:'暗巷里，一个银发的暗精灵靠在墙上。她手里把玩着一枚发光的黑珍珠。"你看起来像是一个需要好东西的人。我这儿有香料、毒药、情报——你要哪样？"',
    outcomes:{
      CRIT_FAIL:{ text:'你买了一份"情报"——结果是她编的。你按情报摸进的地方是暗精灵刺客公会的总部。你被二十把淬毒匕首同时指着。她后来看到你被扔出来时，在旁边笑得直不起腰。', effects:{ addStatus:'dungeon_wanted', flags:{dark_elf_prank:true}, reputation:{dark_elves:-15}, unlockEvents:['dark_elf_assassin_hunt'] }},
      FAIL:{ text:'你买了一瓶"高级香料"——打开后房间里全是洋葱味，熏得你眼泪直流。暗精灵已经不见了。你觉得她此刻正在某个地方用你那几枚金币买了真香料，笑得非常开心。', effects:{ flags:{scammed_by_dark_elf:true}, reputation:{dark_elves:5} }},
      SUCCESS:{ text:'你买了一小袋"夜行者粉末"——在黑暗中抛洒可以标记周围所有隐形生物的位置。暗精灵对你点了点头："下次再来。你比大多数人聪明。"', effects:{ inventory:['nightwalker_dust'], flags:{dark_elf_contact:true}, reputation:{dark_elves:15}, unlockEvents:['dark_elf_trade_route','invisible_stalker_quest'] }},
      CRIT_SUCCESS:{ text:'你没买东西。你请她喝了一杯，听她讲暗精灵地下城的故事。天亮时她把黑珍珠推到你面前。"这个送你。它吸了三个世纪的月光，可以——算了，你以后会知道的。"', effects:{ inventory:['moonlight_pearl'], flags:{dark_elf_friend:true}, reputation:{dark_elves:35}, unlockEvents:['dark_elf_alliance','moonlight_ritual'] }},
    },
  },
  { id:'legendary_ghost_ship', rarity:'legendary', tags:['undead','legendary','weather'],
    scene:'暴风雨夜，一艘半透明的幽灵船搁浅在海岸上。甲板上站着一个独臂的幽灵船长，他看见你，用低沉的声音说："三百年了——终于有人能看见我。年轻人，我需要你的帮助。"',
    outcomes:{
      CRIT_FAIL:{ text:'你上船帮忙，但踩到了一块腐烂的甲板——你从幽灵船的船底穿了过去。你被海水冲上了岸，浑身是沙。幽灵船长在甲板上看着你："也许...你可以先练练怎么走路。"', effects:{ flags:{ghost_ship_fail:true}, reputation:{undead:5}, unlockEvents:['ghost_captain_try_again'] }},
      FAIL:{ text:'你没帮上什么忙。但船长没有怪你——"能看见我已经很不容易了。"他给了你一枚潮湿的银币，上面刻着他生前的头像。看起来不太值钱，但在月光下会自己发光。', effects:{ inventory:['ghost_silver_coin'], flags:{met_ghost_captain:true}, reputation:{undead:5} }},
      SUCCESS:{ text:'你帮船长清理了甲板上的诅咒藤蔓。船终于可以从浅滩上重新浮起来。他给了你一顶旧船长帽——"戴上它，你可以在任何水域不迷路。"', effects:{ inventory:['captain_hat'], flags:{ghost_captain_ally:true}, reputation:{undead:20}, unlockEvents:['sunken_treasure_map','undead_port_access'] }},
      CRIT_SUCCESS:{ text:'你帮船长解开了他三百年的诅咒——原来他一直在等有人对他说"船员已就位"。你说出了这句话。幽灵船升入夜空，化作无数星点。甲板上只留下一个古老的指南针，永远指向回家的方向。', effects:{ inventory:['ghost_compass'], flags:{freed_ghost_captain:true}, reputation:{undead:70}, unlockEvents:['ghost_fleet_quest','undead_king_thanks'] }},
    },
  },
  { id:'orc_honor_duel', rarity:'uncommon', tags:['orc','combat','honor'],
    scene:'半兽人酋长把你堵在竞技场的入口。他比你高两个头，但嗓音异常温和："小个子，我听说你很能打。我挑战你——不是仇恨，是荣誉。赢了我，我的战帮尊重你。输了——你也一样得到一个朋友。"',
    outcomes:{
      CRIT_FAIL:{ text:'他第一拳就把你打飞到了场边的泥坑里。但他说到做到——输了你也得到朋友。他把你从泥坑里捞出来，拍了拍你的肩，差点把你又拍进坑里。"下次再来！你的拳头有精神。"', effects:{ flags:{orc_friend:true}, reputation:{orcs:10}, unlockEvents:['orc_training_montage'] }},
      FAIL:{ text:'你坚持了三个回合。酋长收了拳，哈哈大笑——"你是我见过最难打的小个子。"他把自己的旧拳套给了你。破旧但厚实，每一个裂纹都有故事。', effects:{ inventory:['orcs_old_gauntlets'], flags:{orc_sparring_partner:true}, reputation:{orcs:15} }},
      SUCCESS:{ text:'你巧妙地躲过了他的猛击，用速度和技巧打了个平手。酋长脱下手套，握住了你的手："你打得像一个真正的战士。"战帮的兽人集体捶地表示敬意。', effects:{ flags:{orc_honor_win:true}, reputation:{orcs:35}, unlockEvents:['orc_warband_quest','orc_armor_gift'] }},
      CRIT_SUCCESS:{ text:'你赢了——不是靠蛮力，而是用一次完美的关节技让酋长自己认了输。他愣了两秒，然后爆发出震天的笑声："好！太好了！"他摘下了自己的项链——一枚巨狼牙——挂在你脖子上。"以后你是我的血盟兄弟。"', effects:{ inventory:['direwolf_fang_necklace'], flags:{orc_blood_brother:true}, reputation:{orcs:60}, unlockEvents:['orc_army_ally','direwolf_mount_quest'] }},
    },
  },
  { id:'weather_oracle_shrine', rarity:'uncommon', tags:['weather','magic','travel'],
    scene:'山顶上，一座风化的神龛矗立在雷云之下。神龛上刻着字："问天气者，得天气。——风神。"神龛的祭坛上有一个空的铜碗——似乎在等祭品。',
    outcomes:{
      CRIT_FAIL:{ text:'你往铜碗里吐了口唾沫表示不屑。天空降下一道微型闪电——不大，刚好把鞋底烧焦。现在你走路时有清脆的啪啪声，方圆百米内的人都能听见。风神有幽默感，但你不太喜欢。', effects:{ flags:{weather_god_prank:true}, unlockEvents:['appease_wind_god'] }},
      FAIL:{ text:'你丢了一枚铜板进去。天边飘来一朵不太大的乌云，在你头上定点下了一刻钟的小雨。你觉得风神在用实际行动告诉你：铜板只值铜板的雨。', effects:{ flags:{weather_cheapskate:true} }},
      SUCCESS:{ text:'你放了一枚银币。天空放晴了一整天——恰好够你翻过前面那道最难的山脊。风在背后推着你。你在日落时到达了山脚，银币花得值。', effects:{ inventory:['fair_weather_charm'], flags:{wind_god_pleased:true}, unlockEvents:['wind_temple_secret'] }},
      CRIT_SUCCESS:{ text:'你放了一枚金币——你身上唯一的一枚。天空沉默了片刻，然后一道柔软的暖风围住了你。风神给了你一个持续一周的buff：和你同行的所有队友都享受顺风。一行路过的商队不敢相信他们的好运，集体给你鞠了一躬。', effects:{ inventory:['wind_god_blessing'], flags:{wind_god_ally:true}, reputation:{merchants:25}, unlockEvents:['storm_quest','fly_with_wind'] }},
    },
  },
  { id:'bardic_roast_battle', rarity:'uncommon', tags:['tavern','bard','social'],
    scene:'酒馆里，两个吟游诗人正在用歌词互相嘲讽。观众们围成一圈，笑得前仰后合。其中一个诗人看见你，递给你一把鲁特琴："轮到你了，冒险者！你敢上来跟我比一比嘴皮子吗？"',
    outcomes:{
      CRIT_FAIL:{ text:'你接过了琴——但你只会三个和弦。你唱了一段，押韵失败，节奏跑偏。酒馆安静了下来，不是因为感动——是因为尴尬。一个老矮人拍了拍你："下次还是打架吧。"', effects:{ flags:{bardic_embarrassment:true}, reputation:{bards:-5, tavern_regulars:-5} }},
      FAIL:{ text:'你勉强唱了一首，虽然普普通通，但你的勇气得到了观众的礼貌性掌声。主持吟游诗人给了你一张乐谱作为鼓励："练好这首曲子，下次再来。"', effects:{ inventory:['practice_sheet_music'], flags:{bardic_attempt:true} }},
      SUCCESS:{ text:'你的歌词犀利又风趣，观众们沸腾了。对手认输后请你喝了一杯——"你是第一个能跟上节奏的冒险者。"他留了一张名片给你，说吟游诗人公会随时欢迎你。', effects:{ flags:{bardic_respect:true}, reputation:{bards:20, tavern_regulars:15}, unlockEvents:['bard_guild_invite','tavern_opening_act'] }},
      CRIT_SUCCESS:{ text:'你即兴创作了一段史诗说唱，把在场所有人名都押了进去，连那个全程板着脸的兽人守卫都破功笑了。这段被录入了本年度的"酒馆最佳现场"合集。你被授予了"民间传说级段子手"的称号。', effects:{ inventory:['golden_lute_pick'], flags:{bardic_legend:true}, reputation:{bards:50, tavern_regulars:40}, unlockEvents:['royal_court_performance','bardic_hall_of_fame'] }},
    },
  },
  { id:'mimic_confusion', rarity:'uncommon', tags:['dungeon','comedy','danger'],
    scene:'你面前有一张桌子，上面放着一杯还冒着热气的茶。但旁边没有椅子，没有杯子，也没有人。茶自己冒着热气。你凑近——茶杯突然开口说话了："看什么看？没见过杯子喝茶？"',
    outcomes:{
      CRIT_FAIL:{ text:'你伸手去碰杯子——桌子也活了过来。桌子和杯子是一对拟态魔物夫妇，它们觉得你"很没礼貌"。你被桌子和杯子追了三条走廊。', effects:{ flags:{mimic_couple_enemy:true}, unlockEvents:['mimic_revenge','mimic_house_hunt'] }},
      FAIL:{ text:'你礼貌地后退。杯子哼了一声："算你识相。"然后继续喝它的茶。你赶紧离开，却发现你的水袋被换了——里面现在是那杯茶。味道还行。', effects:{ inventory:['mystery_tea'], flags:{mimic_tea:true} }},
      SUCCESS:{ text:'你跟它们聊了半小时，发现这对拟态魔物夫妻正在为找不到合适的住所发愁。你推荐了附近的一个空置地牢——它们给你留了一个暗号，说以后在别的城堡里遇到拟态魔物可以报它们名字。', effects:{ flags:{mimic_friend:true}, reputation:{mimics:25}, unlockEvents:['mimic_house_warming','mimic_guardian'] }},
      CRIT_SUCCESS:{ text:'你帮它们找到了一个空置的地下室——里面还有一套完整的旧家具（不会说话的那种）。它们感动得当场变化成了超级舒适的沙发组合。临走时它们给了你一枚"拟态魔物友好徽章"——带着它，你遇到的拟态魔物都不会攻击你。', effects:{ inventory:['mimic_friend_badge'], flags:{mimic_ally:true}, reputation:{mimics:50} }},
    },
  },
  // 10 more chain events (unlocked by previous events)
  { id:'angry_dragon_mother', rarity:'rare', tags:['dragon','danger','weather'],
    scene:'天空突然暗了下来——一头巨大的母龙降落在你面前，方圆百米的地面都在颤抖。她的眼睛锁定了你，瞳孔中倒映着你抱走龙蛋的那个瞬间。',
    outcomes:{
      CRIT_FAIL:{ text:'母龙在你身上留下了一道永久性的龙痕——任何龙族都能认出你。从此你只要靠近有龙出没的地方，就会被集体围观。你的通缉令在龙族内部流传。', effects:{ addStatus:'dungeon_wanted', flags:{dragon_fugitive:true}, reputation:{dragons:-80}, unlockEvents:['dragon_hunt_squad'] }},
      FAIL:{ text:'母龙用龙语对你下了一道令：你必须在三个月内献上一件等值的宝物作为赔偿。她还给了你一份"龙族赔偿条款"——一张羊皮卷，上面用烧焦的爪印列出了清单。', effects:{ flags:{dragon_debt:true}, reputation:{dragons:-20}, unlockEvents:['dragon_treasure_quest'] }},
      SUCCESS:{ text:'你坦诚地解释了——蛋不是偷来的，是它自己选择跟你走的。母龙沉默了。然后她低头近距离看了你很久，最后轻声说："如果我的孩子信你，那我也信你。但保护它，否则你知道后果。"', effects:{ flags:{dragon_trust:true}, reputation:{dragons:30}, unlockEvents:['dragon_protector_quest'] }},
      CRIT_SUCCESS:{ text:'母龙没有惩罚你。相反，她给了你一枚她的鳞片——不是警告，而是保护。"拿着它，整个龙族都知道你是我孩子的守护者。"她说。然后展翅飞走了，风把她的低语留在你耳边："我很高兴它选了你。"', effects:{ inventory:['mother_dragon_scale'], flags:{dragon_protector:true}, reputation:{dragons:60} }},
    },
  },
  { id:'egg_hatching_event', rarity:'rare', tags:['dragon','magic','companion'],
    scene:'龙蛋在你背包里开始轻轻震动。裂缝出现了——一条小小的光从蛋壳里透出来。',
    outcomes:{
      CRIT_FAIL:{ text:'幼龙出来了——但它的第一口龙息把你背包里所有东西都熏黑了。包括你的午餐。它打了个嗝，看起来挺开心的。你不太开心。', effects:{ inventory:['baby_dragon'], flags:{hatching_mess:true}, addStatus:'goblin_smell' }},
      FAIL:{ text:'蛋裂开了，但幼龙似乎不太想出来。它探出半个脑袋看了看你，又缩回去了。你现在有一个半孵化的龙蛋和一个社恐的幼龙。路还很长。', effects:{ inventory:['shy_baby_dragon_egg'], flags:{slow_hatching:true} }},
      SUCCESS:{ text:'一只银灰色的小龙从蛋壳里站了起来，抖了抖翅膀。它歪着脑袋看了你三秒，然后爬到了你的肩膀上，用尾巴卷住了你的脖子。你有了一个同伴。', effects:{ inventory:['baby_dragon'], flags:{dragon_companion:true}, reputation:{dragons:20}, unlockEvents:['raise_a_dragon','dragon_trainer_fame'] }},
      CRIT_SUCCESS:{ text:'幼龙破壳的瞬间，一道虹光冲天而起。方圆数里的商人都看见了那道光芒。小东西抬头对你叫了一声，不是龙啸——是一种类似猫咪撒娇的声音。你知道它会长成一头伟大的龙，而你是它最初的全部世界。', effects:{ inventory:['bonded_baby_dragon'], flags:{dragon_companion_legend:true}, reputation:{dragons:50, merchants:20} }},
    },
  },
  { id:'black_market_egg_deal', rarity:'uncommon', tags:['crime','treasure','social'],
    scene:'一个戴满戒指的胖商人在地下酒馆等你。他的小眼睛在龙蛋上来回扫："这可是真货。开个价吧，冒险者——我这辈子没经手过这么值钱的东西。"',
    outcomes:{
      CRIT_FAIL:{ text:'你开价太高。商人怒了——他认为你是在耍他。他派了两个打手跟着你出去"谈谈"。你损失了五十金币外加一份自尊。', effects:{ flags:{black_market_enemy:true}, reputation:{black_market:-20} }},
      FAIL:{ text:'你犹豫太久。商人失去了兴趣，挥了挥手让你出去。但他给了你一张名片——"下次有东西先来找我。"也许以后还有机会。', effects:{ flags:{black_market_contact:true}, reputation:{black_market:5} }},
      SUCCESS:{ text:'你以一笔丰厚的价格卖掉了龙蛋。胖商人笑得合不拢嘴，额外给了你一块通行令牌——有了它，各地的黑市都对你开放。', effects:{ inventory:['black_market_pass'], flags:{sold_egg:true}, reputation:{black_market:30}, unlockEvents:['black_market_vip','rare_item_auction'] }},
      CRIT_SUCCESS:{ text:'你没有卖——你临时改变了主意。商人看到你的犹豫，反而更尊敬你："不贪心的人现在越来越少了。"他给了你一枚黑市特殊通行证作为礼物，说以后你有什么需要都可以找他。他握着你的手时，你感觉到他少了两根手指——这背后有一个故事。', effects:{ inventory:['black_market_vip_pass'], flags:{kept_egg:true, black_market_respect:true}, reputation:{black_market:40} }},
    },
  },
  { id:'hunted_by_flight', rarity:'rare', tags:['dragon','danger','travel'],
    scene:'远方天际出现了一排黑点。一开始你以为那是鸟——直到它们以惊人的速度变大，你看到了翅膀、利爪、还有龙背上全副武装的龙骑士。他们是来追你的。',
    outcomes:{
      CRIT_FAIL:{ text:'龙骑巡逻队在你的临时营地上空盘旋了整整六圈，每一圈都在你的头顶投下阴影。你躲在一个石缝里不敢动，直到天黑。他们飞走了——但在你的营地留下了龙类追踪标记，方圆百里的龙都能闻到。', effects:{ addStatus:'dungeon_wanted', flags:{tracked_by_riders:true}, reputation:{dragons:-40} }},
      FAIL:{ text:'你狼狈地躲进了一个洞穴。龙骑队的队长在洞口喊了一句话，然后他们飞走了。你没听清那句话，但你觉得肯定不是什么好话。', effects:{ flags:{rider_note:true}, reputation:{dragons:-10} }},
      SUCCESS:{ text:'你提前发现了巡逻队，及时隐藏了行踪。他们从你头顶飞过，没有任何察觉。你还学到了龙骑的巡逻路线——以后可以避开。', effects:{ flags:{evaded_riders:true}, unlockEvents:['dragon_rider_intel'] }},
      CRIT_SUCCESS:{ text:'你没躲。你站了出来，举起双手，然后做了一个标准龙骑敬礼——你在冒险者手册上学到过。巡逻队长降落了。他看着你："你很有勇气。我们接到的命令是追捕你，但命令上没有说不能先请你喝一杯。"一杯酒之后，他说他会报"目标未找到"。', effects:{ flags:{rider_respect:true}, reputation:{dragons:20}, unlockEvents:['dragon_rider_ally','dragon_city_access'] }},
    },
  },
  { id:'rat_king_revenge', rarity:'uncommon', tags:['dungeon','combat','comedy'],
    scene:'夜深了，你的营地周围传来细碎的脚步声——不是一只，是几百只。领头的一只巨大的白鼠坐在由乐高积木搭成的"战车"上，被一群老鼠拉着。它指着你吱吱了两声，翻译过来大概是："就是他。"',
    outcomes:{
      CRIT_FAIL:{ text:'老鼠们偷走了你背包里所有发光的物件——金币、戒指、甚至你背包拉链上的金属扣。第二天你在四十米外的树洞里找到了半包干粮，还有一枚老鼠留下的"收据"（一块被啃过的树皮）。', effects:{ flags:{robbed_by_rats:true}, reputation:{ratfolk:-10} }},
      FAIL:{ text:'你扔了几块奶酪给它们。谈判失败——它们吃了奶酪，但还是偷走了你一只袜子。也许下次带更好的奶酪。', effects:{ flags:{rat_truce_attempt:true} }},
      SUCCESS:{ text:'你坐下开了个会。鼠王原来是"芝士骑士"事件的粉丝，它表示愿意跟你合作——只要以后每年交十块好芝士给鼠人部落。你签了——不对，你咬了——一份鼠皮合同（字面上）。', effects:{ flags:{rat_ally:true}, reputation:{ratfolk:25}, unlockEvents:['rat_spy_network','cheese_trade_route'] }},
      CRIT_SUCCESS:{ text:'你没有打架。你掏出了你包里最后一盒芝士火锅底料——上次哥布林晚宴剩的。鼠王闻了闻，眼睛发出了光。从那天起，你有了一个鼠人情报网——在任何一个城市的老鼠洞里，都有一只老鼠认识你。', effects:{ inventory:['rat_king_whistle'], flags:{rat_network:true}, reputation:{ratfolk:50} }},
    },
  },
  { id:'royal_knight_quest', rarity:'uncommon', tags:['noble','combat','honor'],
    scene:'一个骑白马的皇家传令官来到你面前，展开一卷羊皮卷："国王陛下听说了你的事迹，邀请你参加今年的皇家骑士选拔赛。如果你获胜，将被授予骑士头衔和封地。"',
    outcomes:{
      CRIT_FAIL:{ text:'你在第一轮就被刷下来了——不是因为你不够格，是因为你的对手用了一把涂了蒙汗药的剑。你醒来时已经在场外了，旁边放了一张小字条："下次别用普通抗毒药剂。——你的对手。"', effects:{ flags:{tournament_cheated:true}, reputation:{royal_court:-10}, unlockEvents:['find_cheater'] }},
      FAIL:{ text:'你没能进入决赛，但你得了"最佳风格奖"——因为你的装备搭配被裁判团公认为"最有个性"。奖品是一面小盾牌，上面刻着"风格不是一切"。', effects:{ inventory:['style_shield'], flags:{tournament_style:true}, reputation:{royal_court:5} }},
      SUCCESS:{ text:'你一路过关斩将打进决赛，最终获得亚军。国王亲自给你挂上了一枚银质勋章，并说"明年再来"。封地没有——但一个骑士导师看上了你，愿意免费训练你。', effects:{ flags:{tournament_silver:true}, reputation:{royal_court:25}, unlockEvents:['knight_training','border_defense'] }},
      CRIT_SUCCESS:{ text:'你赢了。决赛上你在马上使出了一套从未有人见过的剑法——那套剑法来自你所有的冒险经历。国王站起来为你鼓掌。你被授予了骑士头衔、一片封地、还有一匹你亲自挑选的白马。册封仪式上你说："我只是一直在做正确的事。"', effects:{ inventory:['knight_title_deed'], flags:{royal_knight:true}, reputation:{royal_court:60, dwarves:10, orcs:10} }},
    },
  },
  { id:'dark_elf_alliance', rarity:'rare', tags:['dark_elf','social','magic'],
    scene:'暗精灵地下城的长老议会正在开会。你被带到了大厅中央——十二位银发长老围坐在发光的蘑菇圈里。首席长老开口："我们听说了你的珍珠。那是我们的圣物。你愿意把它还给我们吗？条件你可以提。"',
    outcomes:{
      CRIT_FAIL:{ text:'你拒绝归还。长老们叹息，对你下了一道驱逐令——从此你在暗精灵领地不受欢迎，所有暗精灵商人都不会跟你交易。', effects:{ flags:{dark_elf_exiled:true}, reputation:{dark_elves:-40} }},
      FAIL:{ text:'你要求等价交换。长老给了你一堆金币——不多不少，恰好是你需要的量。珍珠回到了它原来的位置，暗精灵们对你点了点头。交易完成，各取所需。', effects:{ flags:{dark_elf_transaction:true} }},
      SUCCESS:{ text:'你还了珍珠——但提出用它作为交换条件，请暗精灵为你开一门"夜行者训练"课程。长老们同意了。七天后你学会了如何在完全黑暗中视物——每分钟只能持续三十秒，但已经足以改变很多战斗的走向。', effects:{ inventory:['darkvision_skill'], flags:{dark_elf_student:true}, reputation:{dark_elves:30}, unlockEvents:['dark_elf_artifact_hunt'] }},
      CRIT_SUCCESS:{ text:'你双手捧着珍珠走向祭坛。珍珠滑入凹槽时，整个地下城都被月光点亮——虽然是白天。长老们全体起立，首席长老流泪了："这颗珍珠带走了暗精灵三世纪的黑暗。你给了我们月光。"你被授予"月光使者"的称号和一枚暗精灵权杖——暗精灵会在你需要时来援助你。', effects:{ inventory:['dark_elf_scepter'], flags:{dark_elf_hero:true}, reputation:{dark_elves:80} }},
    },
  },
  { id:'remove_hand_curse', rarity:'uncommon', tags:['curse','magic','quest'],
    scene:'你找到了那个据说能解诅咒的老法师。他住在沼泽里的一座歪塔里，塔身斜得你怀疑随时会倒。老法师看了看你的右手："这个诅咒有年头了。解不难——但你需要帮我去采一味药引。"',
    outcomes:{
      CRIT_FAIL:{ text:'你采回的药引是假的——沼泽里有一种长得很像的毒蘑菇。老法师差点赔上自己的胡子。他用水泼了你一身作为惩罚——但水有点热，还有泡泡。"下次看清楚再摘！"' , effects:{ flags:{wrong_ingredient:true}, unlockEvents:['try_cure_again'] }},
      FAIL:{ text:'你采的药引对了——但量不够。诅咒减轻了：你的右手现在每隔一个钟头才偷一次东西，以前是每十分钟。老法师说这叫"阶段性成果"。', effects:{ flags:{curse_weakened:true} }},
      SUCCESS:{ text:'药引采对了。老法师熬了一锅冒着彩虹色泡沫的汤药，你把右手泡了进去。诅咒解了。你的手又属于你了。老法师还在你手背上画了一个护符："防复发。保修一年。"', effects:{ flags:{curse_cured:true}, reputation:{wizards:10} }},
      CRIT_SUCCESS:{ text:'你不只采到了药引——你还发现了一种稀有草药。老法师激动得把他珍藏的《初级诅咒防护手册》送给了你。是旧的，书角都被他翻烂了，但这是他五十年的心血。' , effects:{ inventory:['curse_protection_manual'], flags:{curse_cured:true, wizard_apprentice:true}, reputation:{wizards:30}, unlockEvents:['apprentice_quest','help_cursed_victims'] }},
    },
  },
  { id:'dragon_rider_ally', rarity:'rare', tags:['dragon','travel','combat'],
    scene:'天空中出现了一头熟悉的龙——那名请过你喝酒的龙骑士。他降落在你旁边，向你伸出了手："我需要一个帮手。有个村子被山贼围困了。一个人的龙不够用——你愿意跟我一起飞吗？"',
    outcomes:{
      CRIT_FAIL:{ text:'你害怕了。在龙背上你全程闭眼，下来时腿抖得站不稳。龙骑士忍住笑——忍得不够成功。"下次...也许骑马更好。"', effects:{ flags:{afraid_of_flight:true} }},
      FAIL:{ text:'你尽力了——但山贼太多了。你们救了一半的村子。另一半村民在感谢你的同时也在哭。龙骑士给了你一瓶龙息药剂作为答谢："下次我们会有更多的人。"', effects:{ inventory:['dragon_breath_potion'], flags:{half_saved_village:true} }},
      SUCCESS:{ text:'你俩配合默契，把山贼打得落花流水。村民拿出了藏了一百年的老酒感谢你们。在篝火旁，龙骑士脱下手套："你骑得不错。以后需要空中支援就叫我。"他给了你一个龙笛。', effects:{ inventory:['dragon_flute'], flags:{rider_brother:true}, reputation:{dragons:20, villagers:30} }},
      CRIT_SUCCESS:{ text:'你在救援中救出了山贼头目关在地窖里的百姓——整整十五个人。龙骑士的龙在你旁边降落，所有人被送到了安全地带。你的名字在这个地区被自动写入了当地的英雄录。龙骑士立誓在你有需要时永远会来。', effects:{ inventory:['rider_oath_badge'], flags:{hero_of_village:true}, reputation:{dragons:40, villagers:80} }},
    },
  },
];

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
if(typeof module!=='undefined'&&module.exports){module.exports={classifyTier,tierLabel,tierEmoji,generateEvent,generateOutcome,pickRandomStatus,STATUS_POOL,generateChainEvent,STORY_EVENTS,ACTIONS,LOCATIONS,TARGETS,COMPLICATIONS};}
