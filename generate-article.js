#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const ARTICLES_FILE = path.join(__dirname, 'data/articles.json');
const INDEX_FILE = path.join(__dirname, 'index.html');
const ARTICLES_DIR = path.join(__dirname, 'articles');

const THUMBS = {
  1:"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
  2:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80",
  3:"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80",
  4:"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80",
  5:"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80"
};
const DEFAULT_THUMB = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80";

const ARTICLE_THEMES = [
  {title:"【{year}年{month}月最新】AI転職市場の動向まとめ",category:"市場動向",tag:"市場動向",prompt:"2026年のAI・機械学習エンジニアの転職市場動向について、需要の高いスキル、年収トレンド、企業のニーズを800文字程度で解説してください。見出しをつけて読みやすく構成してください。"},
  {title:"AIエンジニアが年収アップに成功した転職術【実例つき】",category:"転職ノウハウ",tag:"年収アップ",prompt:"AIエンジニアが転職で年収アップを実現するための具体的な方法を800文字程度で解説してください。スキルの見せ方、交渉術、タイミングなどの実践的なアドバイスを含めてください。見出しをつけて読みやすく構成してください。"},
  {title:"LLM・生成AI専門エンジニアの転職完全ガイド",category:"職種解説",tag:"生成AI",prompt:"LLM・生成AI専門エンジニアの転職について、求められるスキルセット、年収相場、おすすめの転職サービスを800文字程度で解説してください。見出しをつけて読みやすく構成してください。"},
  {title:"データサイエンティストからAIエンジニアへの転職ロードマップ",category:"キャリア",tag:"キャリアチェンジ",prompt:"データサイエンティストがAIエンジニアに転職するためのステップ、必要なスキルの習得方法、転職活動の進め方を800文字程度で解説してください。見出しをつけて読みやすく構成してください。"},
  {title:"AI転職エージェントの選び方｜失敗しない3つのポイント",category:"転職ノウハウ",tag:"エージェント選び",prompt:"AI・IT系転職エージェントを選ぶ際の重要なポイントを800文字程度で解説してください。専門性、求人数、サポート体制などの観点から具体的なチェックポイントを含めてください。見出しをつけて読みやすく構成してください。"},
  {title:"30代からのAIエンジニア転職は遅い？成功事例と戦略",category:"体験談",tag:"30代転職",prompt:"30代からAIエンジニアへの転職を考えている方向けに、成功のポイントと注意点を800文字程度で解説してください。年齢を強みに変える方法も含めてください。見出しをつけて読みやすく構成してください。"}
];

function callAnthropicAPI(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { reject(new Error('ANTHROPIC_API_KEY が設定されていません')); return; }
    const body = JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1200,messages:[{role:'user',content:prompt}]});
    const options = {hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}};
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data).content[0].text); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function textToHtml(text) {
  return text.split('\n').map(line => {
    if (line.startsWith('## ')) return '<h2>' + line.slice(3).replace(/\*\*(.+?)\*\*/g, '<u>$1</u>') + '</h2>';
    if (line.startsWith('### ')) return '<h3>' + line.slice(4).replace(/\*\*(.+?)\*\*/g, '<u>$1</u>') + '</h3>';
    if (line.startsWith('# ')) return '';
    if (line.startsWith('- ') || line.startsWith('・')) return '<li>' + line.slice(2).replace(/\*\*(.+?)\*\*/g, '<u>$1</u>') + '</li>';
    if (line.trim() === '') return '';
    return '<p>' + line.replace(/\*\*(.+?)\*\*/g, '<u>$1</u>') + '</p>';
  }).join('\n').replace(/(<li>.*<\/li>\n?)+/g, match => '<ul>' + match + '</ul>');
}

function generateArticleHtml(article, content) {
  const thumb = THUMBS[article.id] || DEFAULT_THUMB;
  const canonical = 'https://ai-tensyoku.kujira-media.com/articles/article' + article.id + '.html';
  const cta = '<div class="cta-box" id="cta-box"></div>\n<script>\nvar CTA_ADS = [\n  {title:"RareTECH\uff5c\u7121\u6599\u30ab\u30a6\u30f3\u30bb\u30ea\u30f3\u30b0\u5b9f\u65bd\u4e2d",desc:"\u672a\u7d4c\u9a13\u304b\u3089IT\u30a8\u30f3\u30b8\u30cb\u30a2\u8ee2\u8077\u3092\u5b9f\u73fe\u3002AI\u30fb\u30c7\u30fc\u30bf\u30b5\u30a4\u30a8\u30f3\u30b9\u3082\u5b66\u3079\u308b500\u30b9\u30c6\u30c3\u30d7\u306e\u30ab\u30ea\u30ad\u30e5\u30e9\u30e0\u3002",btn:"RareTECH\u306b\u7121\u6599\u76f8\u8ac7\u3059\u308b \u2192",href:"//af.moshimo.com/af/c/click?a_id=5436031&p_id=6650&pc_id=18963&pl_id=85032",imp:"//i.moshimo.com/af/i/impression?a_id=5436031&p_id=6650&pc_id=18963&pl_id=85032"},\n  {title:"Tamesy\uff5c\u5b9a\u7740\u738798.5%\u306e\u8ee2\u8077\u30a8\u30fc\u30b8\u30a7\u30f3\u30c8",desc:"AI\u30a8\u30f3\u30b8\u30cb\u30a2\u5411\u3051\u6c42\u4eba\u591a\u6570\u30025\u4eba\u306b4\u4eba\u304c1\u30f6\u6708\u3067\u5185\u5b9a\u7372\u5f97\u3002\u521d\u56de\u9762\u8ac7\u304b\u3089\u5fb9\u5e95\u30b5\u30dd\u30fc\u30c8\u3002",btn:"Tamesy\u306b\u7121\u6599\u76f8\u8ac7\u3059\u308b \u2192",href:"//af.moshimo.com/af/c/click?a_id=5435994&p_id=7048&pc_id=20176&pl_id=89504",imp:"//i.moshimo.com/af/i/impression?a_id=5435994&p_id=7048&pc_id=20176&pl_id=89504"},\n  {title:"\u5c31\u8077\u30ab\u30ec\u30c3\u30b8\uff5c\u672a\u7d4c\u9a13\u30fb\u65e2\u5352\u3067\u3082\u5b89\u5fc3\u306e\u5c31\u8077\u652f\u63f4",desc:"\u30d5\u30ea\u30fc\u30bf\u30fc\u30fb\u672a\u7d4c\u9a13\u30fb\u4e2d\u9000\u30fb\u65e2\u5352\u306e\u65b9\u5411\u3051\u306b\u7121\u6599\u3067\u5c31\u8077\u3092\u30b5\u30dd\u30fc\u30c8\u3002\u5165\u793e\u5f8c\u307e\u3067\u5fb9\u5e95\u652f\u63f4\u3002",btn:"\u7121\u6599\u3067\u5c31\u8077\u76f8\u8ac7\u3059\u308b \u2192",href:"//af.moshimo.com/af/c/click?a_id=5467007&p_id=7267&pc_id=20834&pl_id=91710",imp:"//i.moshimo.com/af/i/impression?a_id=5467007&p_id=7267&pc_id=20834&pl_id=91710"}\n];\nvar ad = CTA_ADS[Math.floor(Math.random()*CTA_ADS.length)];\ndocument.getElementById("cta-box").innerHTML = "<h3>"+ad.title+"<\\/h3><p>"+ad.desc+"<\\/p><a href=\\""+ad.href+"\\" rel=\\"nofollow\\" referrerpolicy=\\"no-referrer-when-downgrade\\" class=\\"btn-primary\\">"+ad.btn+"<\\/a><img src=\\""+ad.imp+"\\" width=\\"1\\" height=\\"1\\" style=\\"border:none;display:none;\\" loading=\\"lazy\\">";\n<\/script>';

  return '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + article.title + ' | AI転職ナビ</title>\n<meta name="description" content="' + article.excerpt + '">\n<link rel="canonical" href="' + canonical + '">\n<style>\n:root{--primary:#1a1f36;--accent:#2563EB;--accent-light:#EFF6FF;--text:#111827;--text-secondary:#4B5563;--text-muted:#9CA3AF;--bg:#F9FAFB;--surface:#FFFFFF;--border:#E5E7EB;--radius:12px;}\n*{box-sizing:border-box;margin:0;padding:0;}\nbody{font-family:"Hiragino Kaku Gothic ProN","Noto Sans JP",-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.8;}\na{color:var(--accent);text-decoration:none;}a:hover{text-decoration:underline;}\nheader{background:var(--primary);padding:0 24px;}\n.header-inner{max-width:860px;margin:0 auto;display:flex;align-items:center;height:56px;}\n.logo{font-size:17px;font-weight:700;color:#fff;}.logo span{color:#60A5FA;}\n.article-wrap{max-width:860px;margin:0 auto;padding:40px 24px;}\n.breadcrumb{font-size:12px;color:var(--text-muted);margin-bottom:24px;}\n.breadcrumb a{color:var(--text-muted);}\n.article-cat{display:inline-block;background:var(--accent-light);color:var(--accent);font-size:12px;font-weight:700;padding:3px 10px;border-radius:4px;margin-bottom:12px;}\nh1{font-size:clamp(20px,3vw,28px);font-weight:800;line-height:1.4;margin-bottom:16px;}\n.article-meta{display:flex;gap:16px;font-size:13px;color:var(--text-muted);margin-bottom:32px;}\n.hero-img{width:100%;height:300px;object-fit:cover;border-radius:var(--radius);margin-bottom:32px;}\n.article-body h2{font-size:20px;font-weight:700;margin:40px 0 16px;padding-left:12px;border-left:4px solid var(--accent);}\n.article-body h3{font-size:17px;font-weight:700;margin:28px 0 12px;}\n.article-body p{margin-bottom:16px;color:var(--text-secondary);}\n.article-body ul{margin:0 0 16px 20px;color:var(--text-secondary);}\n.article-body ul li{margin-bottom:8px;}\n.cta-box{background:var(--accent-light);border:2px solid var(--accent);border-radius:var(--radius);padding:24px;margin:40px 0;text-align:center;}\n.cta-box h3{font-size:18px;font-weight:700;margin-bottom:8px;}\n.cta-box p{font-size:14px;color:var(--text-secondary);margin-bottom:16px;}\n.btn-primary{display:inline-block;background:var(--accent);color:#fff;font-size:15px;font-weight:700;padding:12px 32px;border-radius:8px;}\n.btn-primary:hover{background:#1D4ED8;text-decoration:none;}\nfooter{background:var(--primary);color:rgba(255,255,255,.5);padding:24px;text-align:center;font-size:12px;margin-top:40px;}\n</style>\n</head>\n<body>\n<header><div class="header-inner"><a href="/" class="logo">AI転職<span>ナビ</span></a></div></header>\n<div class="article-wrap">\n<div class="breadcrumb"><a href="/">トップ</a> &gt; <a href="/">転職コラム</a> &gt; ' + article.title + '</div>\n<span class="article-cat">' + article.category + '</span>\n<h1>' + article.title + '</h1>\n<div class="article-meta"><span>📅 ' + article.date + '</span><span>⏱ 読了時間 約' + article.readTime + '分</span></div>\n<img class="hero-img" src="' + thumb + '" alt="' + article.title + '">\n<div class="article-body">\n' + textToHtml(content) + '\n' + cta + '\n</div>\n</div>\n<footer><p>© 2026 AI転職ナビ. All rights reserved.</p></footer>\n</body>\n</html>';
}

function updateIndexHtml(articles) {
  let html = fs.readFileSync(INDEX_FILE, 'utf-8');
  const articlesData = articles.map(function(a) {
    const obj = {id:a.id,title:a.title,excerpt:a.excerpt,date:a.date,category:a.category,readTime:a.readTime,tag:a.tag};
    if (a.url) obj.url = a.url;
    return obj;
  });
  const articlesJson = JSON.stringify(articlesData, null, 2);
  const newBlock = '// 記事データ（静的）\nconst ARTICLES = ' + articlesJson + ';\n\n// 記事をロードして描画\nfunction loadArticles() {\n  renderArticles(ARTICLES);\n  renderArticlesGrid(ARTICLES);\n}';
  html = html.replace(/\/\/ 記事データ（静的）[\s\S]*?function loadArticles\(\) \{[\s\S]*?\}/, newBlock);
  fs.writeFileSync(INDEX_FILE, html);
  console.log('index.html のARTICLES配列を更新しました');
}

async function generateArticle() {
  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
  const maxId = Math.max(...articles.map(a => a.id));
  const newId = maxId + 1;

  const recentTitles = articles.slice(-6).map(a => a.title);
  const availableThemes = ARTICLE_THEMES.filter(t => !recentTitles.some(rt => rt.includes(t.tag)));
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)] || ARTICLE_THEMES[0];

  const now = new Date();
  const title = theme.title.replace('{year}', now.getFullYear()).replace('{month}', now.getMonth() + 1);
  console.log('[' + now.toISOString() + '] 記事生成開始: ' + title);

  let content = '';
  let excerpt = '';
  try {
    content = await callAnthropicAPI(theme.prompt);
    excerpt = content.replace(/\n/g, ' ').replace(/#+\s/g, '').slice(0, 150) + '…';
    console.log('APIからの生成成功');
  } catch(err) {
    console.error('API呼び出し失敗:', err.message);
    content = '## ' + title + 'について\n\n' + title + 'について、転職を検討しているAI・機械学習エンジニア向けに詳しく解説します。';
    excerpt = title + 'について、転職を検討しているAI・機械学習エンジニア向けに詳しく解説します。';
  }

  const articleFileName = 'article' + newId + '.html';
  const articleUrl = 'articles/' + articleFileName;
  const newArticle = {id:newId,title,excerpt,date:now.toISOString().split('T')[0],category:theme.category,readTime:Math.floor(Math.random()*4)+4,tag:theme.tag,url:articleUrl};

  // 記事HTMLページを生成
  const articleHtml = generateArticleHtml(newArticle, content);
  fs.writeFileSync(path.join(ARTICLES_DIR, articleFileName), articleHtml);
  console.log('記事ページ生成: ' + articleFileName);

  // articles.jsonを更新（既存記事のurlも保持）
  articles.unshift(newArticle);
  if (articles.length > 20) articles.splice(20);
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));
  console.log('[' + now.toISOString() + '] 記事追加完了: ID=' + newArticle.id);

  // index.htmlも更新
  updateIndexHtml(articles);
}

generateArticle().catch(err => { console.error('エラー:', err); process.exit(1); });
