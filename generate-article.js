#!/usr/bin/env node
/**
 * 自動記事生成スクリプト
 * 使い方: node generate-article.js
 * cron設定例（週2回 月・木の朝8時）:
 *   0 8 * * 1,4 /usr/bin/node /path/to/generate-article.js >> /var/log/article-gen.log 2>&1
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ARTICLES_FILE = path.join(__dirname, 'data/articles.json');

// 記事テーマのテンプレートプール
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
    if (!apiKey) {
      reject(new Error('ANTHROPIC_API_KEY が設定されていません'));
      return;
    }

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
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content[0].text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generateArticle() {
  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
  const maxId = Math.max(...articles.map(a => a.id));

  // テーマをランダム選択（ただし最近使ったものは除外）
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
    // 最初の150文字を抜粋として使用
    excerpt = content.replace(/\n/g, ' ').slice(0, 150) + '…';
    console.log('APIからの生成成功');
  } catch (err) {
    console.error('API呼び出し失敗、フォールバックテキスト使用:', err.message);
    excerpt = `${title}について、転職を検討しているAI・機械学習エンジニア向けに詳しく解説します。市場動向から実践的なアドバイスまでお伝えします。`;
  }

  const newArticle = {
    id: maxId + 1,
    title,
    excerpt,
    date: now.toISOString().split('T')[0],
    category: theme.category,
    readTime: Math.floor(Math.random() * 4) + 4, // 4〜7分
    tag: theme.tag
  };

  // 先頭に追加（最新順）
  articles.unshift(newArticle);

  // 最大20件に制限
  if (articles.length > 20) articles.splice(20);

  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));
  console.log(`[${now.toISOString()}] 記事追加完了: ID=${newArticle.id}, タイトル="${title}"`);
}

generateArticle().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
