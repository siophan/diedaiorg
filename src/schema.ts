// 后台可编辑数据表的统一配置：服务端用于字段白名单校验，前端后台用于自动生成表单与列表
export type Field = {
  k: string
  label: string
  t?: 'text' | 'textarea' | 'richtext' | 'image' | 'number' | 'bool' | 'select' | 'date' | 'url' | 'edition'
  opts?: [string, string][]
  req?: boolean
  help?: string
  ro?: boolean
}
export type TableDef = {
  label: string
  icon: string
  fields: Field[]
  list: string[]
  search: string[]
  order: string
  filters?: string[]
  noCreate?: boolean
  group: 'content' | 'data'
}

const NEWS_CAT: [string, string][] = [['news', '盛典动态'], ['wechat', '公众号文章'], ['media', '媒体报道'], ['notice', '通知公告']]
const PEOPLE_CAT: [string, string][] = [['founder', '发起人'], ['judge', '专家评审'], ['guest', '颁奖嘉宾']]
const PARTNER_CAT: [string, string][] = [['school', '合作院校'], ['org', '合作机构'], ['organizer', '主/承办单位'], ['support', '支持单位'], ['media', '合作媒体'], ['sponsor', '赞助伙伴']]
const ED_STATUS: [string, string][] = [['upcoming', '筹备中'], ['open', '征集中'], ['judging', '评审中'], ['finished', '已结束']]
const SUB_STATUS: [string, string][] = [['pending', '待审核'], ['reviewing', '评审中'], ['shortlisted', '入围'], ['nominated', '提名'], ['awarded', '获奖'], ['rejected', '未通过']]
const REG_STATUS: [string, string][] = [['pending', '待审核'], ['approved', '已通过'], ['rejected', '未通过']]
export const GENRES: [string, string][] = [['剧情片', '剧情片'], ['纪录片', '纪录片'], ['动画片', '动画片'], ['剧情短片', '剧情短片'], ['实验片', '实验片']]

export const TABLES: Record<string, TableDef> = {
  news: {
    label: '新闻动态', icon: 'fa-newspaper', group: 'content',
    fields: [
      { k: 'title', label: '标题', req: true },
      { k: 'category', label: '分类', t: 'select', opts: NEWS_CAT },
      { k: 'cover', label: '封面图', t: 'image' },
      { k: 'summary', label: '摘要', t: 'textarea' },
      { k: 'content', label: '正文', t: 'richtext' },
      { k: 'source', label: '来源' },
      { k: 'source_url', label: '原文链接', t: 'url' },
      { k: 'published_at', label: '发布日期', t: 'date' },
      { k: 'featured', label: '首页推荐', t: 'bool' },
      { k: 'status', label: '状态', t: 'select', opts: [['published', '已发布'], ['draft', '草稿']] },
    ],
    list: ['cover', 'title', 'category', 'published_at', 'featured', 'status'],
    search: ['title', 'summary', 'source'], filters: ['category', 'status'],
    order: 'published_at DESC, id DESC',
  },
  editions: {
    label: '历届盛典', icon: 'fa-trophy', group: 'content',
    fields: [
      { k: 'year', label: '年度', t: 'number', req: true },
      { k: 'title', label: '名称', req: true },
      { k: 'theme', label: '主题' },
      { k: 'event_date', label: '举办时间' },
      { k: 'venue', label: '举办地点' },
      { k: 'cover', label: '封面图', t: 'image' },
      { k: 'summary', label: '简介', t: 'textarea' },
      { k: 'content', label: '详细介绍', t: 'richtext' },
      { k: 'status', label: '状态', t: 'select', opts: ED_STATUS },
      { k: 'registration_open', label: '开放报名', t: 'bool' },
      { k: 'submission_open', label: '开放作品提交', t: 'bool' },
      { k: 'submission_deadline', label: '提交截止日期', t: 'date' },
      { k: 'sort', label: '排序', t: 'number' },
    ],
    list: ['cover', 'year', 'title', 'status', 'registration_open', 'submission_open'],
    search: ['title', 'theme'], order: 'year DESC',
  },
  works: {
    label: '获奖作品', icon: 'fa-film', group: 'content',
    fields: [
      { k: 'title', label: '作品名称', req: true },
      { k: 'en_title', label: '英文名' },
      { k: 'edition_id', label: '所属届次', t: 'edition' },
      { k: 'poster', label: '海报', t: 'image' },
      { k: 'school', label: '院校' },
      { k: 'director', label: '导演/主创' },
      { k: 'award', label: '奖项' },
      { k: 'genre', label: '类型', t: 'select', opts: GENRES },
      { k: 'synopsis', label: '简介', t: 'textarea' },
      { k: 'video_url', label: '视频链接', t: 'url' },
      { k: 'featured', label: '首页展示', t: 'bool' },
      { k: 'sort', label: '排序', t: 'number' },
    ],
    list: ['poster', 'title', 'school', 'award', 'edition_id', 'featured'],
    search: ['title', 'school', 'director', 'award'], filters: ['edition_id'], order: 'sort ASC, id DESC',
  },
  people: {
    label: '人物管理', icon: 'fa-user-tie', group: 'content',
    fields: [
      { k: 'name', label: '姓名', req: true },
      { k: 'category', label: '类别', t: 'select', opts: PEOPLE_CAT },
      { k: 'title', label: '头衔' },
      { k: 'photo', label: '照片', t: 'image' },
      { k: 'bio', label: '简介', t: 'textarea' },
      { k: 'sort', label: '排序', t: 'number' },
      { k: 'visible', label: '显示', t: 'bool' },
    ],
    list: ['photo', 'name', 'category', 'title', 'visible'],
    search: ['name', 'title', 'bio'], filters: ['category'], order: 'category ASC, sort ASC, id ASC',
  },
  partners: {
    label: '合作院校/机构', icon: 'fa-building-columns', group: 'content',
    fields: [
      { k: 'name', label: '名称', req: true },
      { k: 'short_name', label: '简称' },
      { k: 'category', label: '类别', t: 'select', opts: PARTNER_CAT },
      { k: 'logo', label: 'Logo', t: 'image', help: '建议白底或透明 PNG；留空将显示金色文字徽标' },
      { k: 'url', label: '官网', t: 'url' },
      { k: 'sort', label: '排序', t: 'number' },
      { k: 'visible', label: '显示', t: 'bool' },
    ],
    list: ['logo', 'name', 'category', 'sort', 'visible'],
    search: ['name', 'short_name'], filters: ['category'], order: 'category ASC, sort ASC, id ASC',
  },
  gallery: {
    label: '图片集锦', icon: 'fa-images', group: 'content',
    fields: [
      { k: 'image', label: '图片', t: 'image', req: true },
      { k: 'title', label: '标题' },
      { k: 'album', label: '相册', help: '如：颁奖盛典 / 启动发布会 / 签约仪式 / 活动现场' },
      { k: 'edition_id', label: '所属届次', t: 'edition' },
      { k: 'sort', label: '排序', t: 'number' },
      { k: 'visible', label: '显示', t: 'bool' },
    ],
    list: ['image', 'title', 'album', 'edition_id', 'visible'],
    search: ['title', 'album'], filters: ['album'], order: 'sort ASC, id DESC',
  },
  registrations: {
    label: '报名管理', icon: 'fa-id-card', group: 'data', noCreate: true,
    fields: [
      { k: 'code', label: '报名编号', ro: true },
      { k: 'edition_id', label: '届次', t: 'edition' },
      { k: 'name', label: '姓名', req: true },
      { k: 'gender', label: '性别' },
      { k: 'phone', label: '手机', req: true },
      { k: 'email', label: '邮箱' },
      { k: 'wechat', label: '微信' },
      { k: 'school', label: '院校', req: true },
      { k: 'major', label: '专业' },
      { k: 'degree', label: '学历' },
      { k: 'grad_year', label: '毕业年份' },
      { k: 'role', label: '担任角色' },
      { k: 'team_size', label: '团队人数', t: 'number' },
      { k: 'message', label: '备注', t: 'textarea' },
      { k: 'status', label: '审核状态', t: 'select', opts: REG_STATUS },
      { k: 'admin_note', label: '管理员备注', t: 'textarea' },
      { k: 'created_at', label: '提交时间', ro: true },
    ],
    list: ['code', 'name', 'school', 'major', 'phone', 'status', 'created_at'],
    search: ['code', 'name', 'school', 'phone', 'major'], filters: ['status', 'edition_id'], order: 'id DESC',
  },
  submissions: {
    label: '作品提交', icon: 'fa-clapperboard', group: 'data', noCreate: true,
    fields: [
      { k: 'code', label: '作品编号', ro: true },
      { k: 'edition_id', label: '届次', t: 'edition' },
      { k: 'title', label: '作品名称', req: true },
      { k: 'genre', label: '类型', t: 'select', opts: GENRES },
      { k: 'length_type', label: '长/短片', t: 'select', opts: [['短片', '短片'], ['长片', '长片']] },
      { k: 'duration', label: '时长' },
      { k: 'school', label: '院校', req: true },
      { k: 'major', label: '专业' },
      { k: 'grade', label: '年级' },
      { k: 'director', label: '导演' },
      { k: 'crew', label: '主创名单', t: 'textarea' },
      { k: 'teacher', label: '指导教师' },
      { k: 'contact_name', label: '联系人', req: true },
      { k: 'phone', label: '联系电话', req: true },
      { k: 'email', label: '邮箱' },
      { k: 'synopsis', label: '作品简介', t: 'textarea' },
      { k: 'poster', label: '海报/剧照', t: 'image' },
      { k: 'video_url', label: '在线观看链接', t: 'url' },
      { k: 'netdisk_url', label: '网盘链接', t: 'url' },
      { k: 'netdisk_code', label: '提取码' },
      { k: 'status', label: '评审状态', t: 'select', opts: SUB_STATUS },
      { k: 'score', label: '评分', t: 'number' },
      { k: 'admin_note', label: '评审意见', t: 'textarea' },
      { k: 'created_at', label: '提交时间', ro: true },
    ],
    list: ['poster', 'code', 'title', 'school', 'genre', 'status', 'created_at'],
    search: ['code', 'title', 'school', 'director', 'contact_name', 'phone'], filters: ['status', 'edition_id', 'genre'], order: 'id DESC',
  },
  messages: {
    label: '留言/商务合作', icon: 'fa-envelope', group: 'data', noCreate: true,
    fields: [
      { k: 'name', label: '姓名' },
      { k: 'company', label: '单位' },
      { k: 'phone', label: '电话' },
      { k: 'email', label: '邮箱' },
      { k: 'subject', label: '类型' },
      { k: 'content', label: '内容', t: 'textarea' },
      { k: 'status', label: '处理状态', t: 'select', opts: [['new', '未处理'], ['done', '已处理']] },
      { k: 'created_at', label: '时间', ro: true },
    ],
    list: ['name', 'company', 'subject', 'phone', 'status', 'created_at'],
    search: ['name', 'company', 'content', 'phone'], filters: ['status'], order: 'id DESC',
  },
}

// 站点设置分组（后台“站点设置”页使用，结构由 JSON 自动生成表单）
export const SETTING_KEYS: [string, string][] = [
  ['site', '站点基础信息'], ['hero', '首页主视觉'], ['about', '关于盛典'], ['stats', '数据亮点'],
  ['highlights', '活动亮点'], ['support', '扶持计划'], ['ecosystem', '产业生态'], ['rules', '作品征集规则'],
  ['awards', '奖项设置'], ['timeline', '发展历程'], ['organizers', '组织架构'], ['promotion', '传播矩阵'], ['cta', '页尾号召'],
]

export const labelOf = (opts: [string, string][] | undefined, v: string) => (opts || []).find((o) => o[0] === v)?.[1] || v
export { NEWS_CAT, PEOPLE_CAT, PARTNER_CAT, ED_STATUS, SUB_STATUS }
