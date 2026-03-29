#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const ARTICLES_FILE = path.join(__dirname, 'data/articles.json');
const INDEX_FILE = path.join(__dirname, 'index.html');

const THUMBS = {
  1:"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
  2:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80",
  3:"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80",
  4:"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80",
  5:"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80"
};
const DEFAULT_THUMB = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80";

const ARTICLE_THEMES = [
  {
    title: "【{year}年{month}月最新】AI転職市場の動向まとめ",
    category: "市場動向",
    tag: "市場動向",
    prompt: "2026年のAI・機械学習エンジニアの転職市場動向について、需要の高いスキル、年収トレンド、企業のニーズを400文字程度で解説してください。SEOを意識した自然な文章で、転職を検討しているエンジニア向けに書いてください。"
  },
  {
    title: "AIエンジニアが年収アップに成功した転職術【実例つき】",
    category: "転職ノウハウ",
    tag: "年収アップ",
    prompt: "AIエンジニアが転職で年収アップを実現するための具体的な方法を400文字程度で解説してください。スキルの見せ方、交渉術、タイミングなどの実践的なアドバイスを含めてください。"
  },
  {
    title: "LLM・生成AI専門エンジニアの転職完全ガイド",
    category: "職種解説",
    tag: "生成AI",
    prompt: "LLM・生成AI専門エンジニアの転職について、求められるスキルセット、年収相場、おすすめの転職サービスを400文字程度で解説してください。"
  },
  {
    title: "データサイエンティストからAIエンジニアへの転職ロードマップ",
    category: "キャリア",
    tag: "キャリアチェンジ",
    prompt: "データサイエンティストがAIエンジニアに転職するためのステップ、必要なスキルの習得方法、転職活動の進め方を400文字程度で解説してください。"
  },
  {
    title: "AI転職エージェントの選び方｜失敗しない3つのポイント",
    category: "転職ノウハウ",
    tag: "エージェント選び",
    prompt: "AI・IT系転職エージェントを選ぶ際の重要なポイントを400文字程度で解説してください。専門性、求人数、サポート体制などの観点から具体的なチェックポイントを含めてください。"
  },
  {
    title: "30代からのAIエンジニア転職は遅い？成功事例と戦略",
    category: "体験談",
    tag: "30代転職",
    prompt: "30代からAIエンジニアへの転職を考えている方向けに、成功のポイントと注意点を400文字程度で解説してください。年齢を強みに変える方法も含めてください。"
  }
];

function callAnthropicAPI(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { reject(new Error('ANTHROPIC_API_KEY が設定されていません')); return; }

    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).content[0].text); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// index.htmlのARTICLES配列を更新する
function updateIndexHtml(articles) {
  let html = fs.readFileSync(INDEX_FILE, 'utf-8');

  const articlesJson = JSON.stringify(articles.map(a => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    date: a.date,
    category: a.category,
    readTime: a.readTime,
    tag: a.tag,
    url: a.id <= 5 ? `articles/article${a.id}.html` : 'articles/article1.html',
    thumb: THUMBS[a.id] || DEFAULT_THUMB
  })), null, 2);

  // ARTICLES配列を置換
  const newBlock = `// 記事データ（静的）\nconst ARTICLES = ${articlesJson};\n\n// 記事をロードして描画\nfunction loadArticles() {\n  renderArticles(ARTICLES);\n  renderArticlesGrid(ARTICLES);\n}`;

  html = html.replace(
    /\/\/ 記事データ（静的）[\s\S]*?function loadArticles\(\) \{[\s\S]*?\}/,
    newBlock
  );

  fs.writeFileSync(INDEX_FILE, html);
  console.log('index.html のARTICLES配列を更新しました');
}

async function generateArticle() {
  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
  const maxId = Math.max(...articles.map(a => a.id));

  const recentTitles = articles.slice(-6).map(a => a.title);
  const availableThemes = ARTICLE_THEMES.filter(t =>
    !recentTitles.some(rt => rt.includes(t.tag))
  );
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)] || ARTICLE_THEMES[0];

  const now = new Date();
  const title = theme.title
    .replace('{year}', now.getFullYear())
    .replace('{month}', now.getMonth() + 1);

  console.log(`[${now.toISOString()}] 記事生成開始: ${title}`);

  let excerpt;
  try {
    const content = await callAnthropicAPI(theme.prompt);
    excerpt = content.replace(/\n/g, ' ').slice(0, 150) + '…';
    console.log('APIからの生成成功');
  } catch (err) {
    console.error('API呼び出し失敗、フォールバックテキスト使用:', err.message);
    excerpt = `${title}について、転職を検討しているAI・機械学習エンジニア向けに詳しく解説します。`;
  }

  const newArticle = {
    id: maxId + 1,
    title,
    excerpt,
    date: now.toISOString().split('T')[0],
    category: theme.category,
    readTime: Math.floor(Math.random() * 4) + 4,
    tag: theme.tag
  };

  articles.unshift(newArticle);
  if (articles.length > 20) articles.splice(20);
