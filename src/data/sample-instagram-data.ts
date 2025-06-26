import { Document, Domain } from '../types/rag';

// Real Wing Chun Instagram posts from the user's actual content
export const sampleInstagramData: Document[] = [
  {
    id: '17852414667309615',
    content: `Mükemmel bir seminer oldu. Videolar yakında. 
Diğer şehirlerden gelen, izlemeye gelen, tanışmaya gelen arkadaşlara çok teşekkür ederim. 💪🏻

Wing Chun semineri başarılı geçti, farklı şehirlerden katılımcılar vardı. Videolar yakında paylaşılacak.`,
    metadata: {
      title: 'Wing Chun Semineri Başarılı Geçti',
      source: 'instagram',
      domain: 'general',
      contentType: 'post',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'escrima', 'latsao', 'kicks', 'filipinomartialarts', 'martialarts', 'selfdefense'],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      likes: 89,
      comments: 12,
      shares: 5
    }
  },
  {
    id: '17863353525185505',
    content: `2 haftada bir acayip Escrima dönüyor grupta. Hem de ücretsiz. 🥋💪🏻😂

Eğitimler için iletişime geçebilirsiniz.

EBMAS Wing Chun grubunda iki haftada bir Escrima eğitimleri veriliyor ve bu eğitimler ücretsiz.`,
    metadata: {
      title: 'Ücretsiz Escrima Eğitimleri',
      source: 'instagram',
      domain: 'general',
      contentType: 'post',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'escrima', 'filipinomartialarts', 'martialarts'],
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z',
      likes: 67,
      comments: 8,
      shares: 3
    }
  },
  {
    id: '17868913104187749',
    content: `🔥 Dikkatini dağıtma - önemli olan nasıl dövüştüğün! Sparring seanslarımıza katıl ve her durumda nasıl kendini savunacağını öğren. Bir savaşçı gibi antrenman yapmaya hazır mısın?

Sparring antrenmanlarının önemi ve kendini savunma teknikleri hakkında bilgi.`,
    metadata: {
      title: 'Sparring Antrenmanlarının Önemi',
      source: 'instagram',
      domain: 'general',
      contentType: 'post',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'escrima', 'sparring', 'martialarts', 'selfdefense'],
      createdAt: '2024-01-08T10:00:00Z',
      updatedAt: '2024-01-08T10:00:00Z',
      likes: 103,
      comments: 15,
      shares: 7
    }
  },
  {
    id: '17874069213099948',
    content: `Hocaya ne dediğinize dikkat edin 😂

Chi-Sao antrenmanları sırasında yaşanan komik anlar ve öğrenci-hoca ilişkisi.`,
    metadata: {
      title: 'Chi-Sao Antrenman Anları',
      source: 'instagram',
      domain: 'general',
      contentType: 'post',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'chisao', 'escrima', 'martialarts'],
      createdAt: '2024-01-05T10:00:00Z',
      updatedAt: '2024-01-05T10:00:00Z',
      likes: 78,
      comments: 9,
      shares: 4
    }
  },
  {
    id: '17882336436295533',
    content: `Bıçak karşılama serisi çekeyim dedim, çok kısa oluyor videolar. Yine de kararlıyım seriyi çekmeye.

Bu işin ciddiyeti maalesef çoğu usta/eğitmen tarafından kanımca hafife alınıyor, çünkü tüm videolarda sanki çok kolaymış gibi pata küte bıçak karşılayanları görüyoruz. Bunların hepsi DÜMENdir.

Çok ciddi bir yakın mesafe atış eğitiminiz veya Arnis/Kali/Latosa Escrima bilginiz yoksa veya çalıştığınız savaş sanatındaki (Wing Chun/Krav Maga/Systema vs.) tekniği yıllarca ama YILLARCA tekrar etmediyseniz asla ama asla bu tarz hareketlere girmemenizi öneririm.

Bıçak savunmasının ciddiyeti ve gerçekçi yaklaşımın önemi hakkında detaylı açıklama.`,
    metadata: {
      title: 'Bıçak Savunmasının Gerçekleri',
      source: 'instagram',
      domain: 'general',
      contentType: 'article',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'escrima', 'knifedefense', 'selfdefense', 'martialarts'],
      createdAt: '2024-01-03T10:00:00Z',
      updatedAt: '2024-01-03T10:00:00Z',
      likes: 156,
      comments: 28,
      shares: 12
    }
  },
  {
    id: '17942446292893280',
    content: `Chi-Sao(yapışkan eller) antrenmanlarını güreşçilerin sarılma antrenmanları gibi düşünebilirsiniz. Farklı olarak Wing Chun'da eller önde yapılır. Amaç dokunma reflekslerini geliştirmektir. 

Burada chi-sao içindeki bir kombinasyonun karşılıklı bir şekilde nasıl yapıldığını görüyorsunuz. Karşı tarafın gardı statik iken yapmak en mantıklısıdır. Fakelememizin sebebi eğer bunu yapmazsanız boksör yumruğu kafanızda patlatır. 😂

Chi-Sao tekniğinin detaylı açıklaması ve uygulanma prensipleri.`,
    metadata: {
      title: 'Chi-Sao Tekniği Açıklaması',
      source: 'instagram',
      domain: 'general',
      contentType: 'article',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'chisao', 'escrima', 'martialarts'],
      createdAt: '2023-12-28T10:00:00Z',
      updatedAt: '2023-12-28T10:00:00Z',
      likes: 94,
      comments: 11,
      shares: 6
    }
  },
  {
    id: '17955718565943929',
    content: `Wing Chun'da sparring (serbest dövüş), tekniklerin gerçek zamanlı baskı altında ne kadar işe yaradığını test etmenin ve uygulamanın en etkili yoludur. 

Chi-Sao refleksleri ve yapışkan temasları geliştirirken, sparring bu becerilerin kaotik ve öngörülemez bir ortamda ne kadar işe yaradığını gösterir. Rakibin ritmini, niyetini ve açığını hissetmek ancak temaslı, kontrollü bir mücadeleyle gelişir. 

Bu yüzden Wing Chun'da sparring, sadece güç veya hız değil; zamanlama, kontrol, içgörü ve soğukkanlılık sanatıdır. Teoriyi pratiğe dönüştüren yerdir.

Wing Chun'da sparring'in önemi ve Chi-Sao ile ilişkisi hakkında detaylı açıklama.`,
    metadata: {
      title: 'Wing Chun Sparring Felsefesi',
      source: 'instagram',
      domain: 'general',
      contentType: 'article',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'sparring', 'chisao', 'martialarts', 'selfdefense'],
      createdAt: '2023-12-20T10:00:00Z',
      updatedAt: '2023-12-20T10:00:00Z',
      likes: 127,
      comments: 19,
      shares: 8
    }
  },
  {
    id: '17965028582896121',
    content: `Yakadan veya boğazdan tutma, sokakta karşılaşılan en yaygın saldırı biçimlerinden biridir. Bu tarz bir temas, genellikle saldırganın kişiyi sabitlemek, sindirmek ya da bir sonraki saldırıya zemin hazırlamak amacıyla yapılır. 

Özellikle boğaz bölgesine doğrudan yapılan tutuş, ciddi riskler barındırır:

Solunum yolları kısıtlanabilir: Nefes borusuna (trakea) uygulanan baskı, kısa sürede nefes darlığına, panik hissine ve bilinç kaybına yol açabilir.

Uygulanacak prensipler şu sırada olmalıdır:
- Ayakta kalmak önceliktir
- Kol baskısı kırılır
- Karşı saldırıya geçilir
- Temas takibi yapılır (Chi-Sao prensipleriyle)

Boğaz tutma saldırılarının tehlikeleri ve Wing Chun savunma prensipleri.`,
    metadata: {
      title: 'Boğaz Tutma Saldırılarına Karşı Savunma',
      source: 'instagram',
      domain: 'general',
      contentType: 'article',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'selfdefense', 'martialarts', 'chisao'],
      createdAt: '2023-12-15T10:00:00Z',
      updatedAt: '2023-12-15T10:00:00Z',
      likes: 189,
      comments: 23,
      shares: 15
    }
  },
  {
    id: '18003009623757186',
    content: `Wing Chun'da mesafe kontrolü, dövüşün kaderini belirleyen en kritik unsurlardan biridir. Rakip geri çekilirken ya da hamle yaparken, aradaki mesafeyi hızla kapatmak ve teması kurmak, üstünlüğü ele geçirmenin anahtarıdır. 

Özellikle pak-sao gibi kesici tekniklerle rakibin savunmasını dağıtıp, içeriye giriş yaparak zincir yumruklar ve dirseklerle baskıyı artırmak, Wing Chun'un saldırgan ve sürekli baskı kuran doğasını yansıtır. 

Bu yaklaşım, rakibin toparlanmasına izin vermeden savaşı kısa sürede bitirmeyi hedefler ve savunmadan saldırıya geçişin ne kadar akıcı olması gerektiğini ortaya koyar.

Wing Chun'da mesafe kontrolü ve pak-sao tekniği hakkında açıklama.`,
    metadata: {
      title: 'Wing Chun Mesafe Kontrolü ve Pak-Sao',
      source: 'instagram',
      domain: 'general',
      contentType: 'article',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'paksao', 'martialarts', 'sparring'],
      createdAt: '2023-12-10T10:00:00Z',
      updatedAt: '2023-12-10T10:00:00Z',
      likes: 112,
      comments: 16,
      shares: 9
    }
  },
  {
    id: '18012650696713348',
    content: `Chi-Sao(yapışkan eller) sadece bir teknik değil, temasın içindeki savaşı anlamanın yoludur. Wing Chun'da bu egzersiz, hem refleks hem, farkındalık geliştirmek içindir. 

Rakiple temas halindeyken, gözler değil eller görür. Kas değil zihin çalışır. Chi-Sao sayesinde rakibin dengesini, niyetini ve açığını anlık olarak hissedersin. Bu temas, seni içgüdüsel değil bilinçli bir dövüşçüye dönüştürür. 

Bu bir dövüş değil. Bu, savaş başlamadan önce kazanılan kontrolün kendisidir.

Chi-Sao felsefesi ve Wing Chun'daki yeri hakkında derin açıklama.`,
    metadata: {
      title: 'Chi-Sao: Savaş Başlamadan Önce Kazanılan Kontrol',
      source: 'instagram',
      domain: 'general',
      contentType: 'article',
      tags: ['ebmas', 'wingchun', 'wingtsun', 'chisao', 'martialarts', 'philosophy'],
      createdAt: '2023-12-05T10:00:00Z',
      updatedAt: '2023-12-05T10:00:00Z',
      likes: 145,
      comments: 21,
      shares: 11
    }
  },
  {
    id: 'instagram-post-1',
    content: `
Instagram Post Analysis: Travel Photography in Bali

This stunning sunset photo from Uluwatu Temple in Bali captures the golden hour perfectly. The composition shows excellent use of the rule of thirds, with the temple silhouette positioned in the lower third and the dramatic sky filling the upper two-thirds.

Key Elements:
- Location: Uluwatu Temple, Bali, Indonesia
- Time: Golden hour (approximately 6:30 PM local time)
- Camera Settings: Shot with iPhone 14 Pro, edited in Lightroom
- Engagement: 2,847 likes, 156 comments in first 24 hours
- Hashtags: #bali #uluwatu #sunset #travel #photography #indonesia #temple #goldenhour

Performance Metrics:
- Reach: 15,234 accounts
- Impressions: 18,967
- Engagement Rate: 4.2%
- Saves: 89
- Shares: 23

Caption: "Sometimes the most beautiful moments happen when you least expect them. This sunset at Uluwatu Temple reminded me why I fell in love with travel photography. The way the light dances across the ancient stones tells a story that words simply cannot capture. 🌅✨"

Audience Response:
Top comments focused on travel inspiration, photography tips, and location recommendations. Several users asked about camera settings and editing techniques, indicating high engagement quality.
    `,
    metadata: {
      domain: 'instagram' as Domain,
      source: 'instagram_api',
      contentType: 'post',
      createdAt: '2024-01-15T18:30:00Z',
      updatedAt: '2024-01-15T18:30:00Z',
      tags: ['instagram', 'travel', 'photography', 'bali', 'sunset', 'engagement'],
      type: 'instagram_post',
      postId: 'instagram-post-1',
      mediaType: 'photo',
      likesCount: 2847,
      commentsCount: 156,
      engagementRate: 4.2,
      hashtags: ['bali', 'uluwatu', 'sunset', 'travel', 'photography', 'indonesia', 'temple', 'goldenhour']
    }
  },
  {
    id: 'instagram-post-2',
    content: `
Instagram Reel Analysis: Cooking Tutorial - Homemade Pasta

This 60-second cooking reel demonstrates the step-by-step process of making fresh pasta from scratch. The video uses quick cuts, trending audio, and clear visual instructions to maximize engagement.

Recipe Overview:
- Dish: Fresh Fettuccine with Garlic Butter Sauce
- Prep Time: 45 minutes
- Difficulty: Intermediate
- Ingredients: 00 flour, eggs, semolina, garlic, butter, parmesan

Video Structure:
1. Ingredient showcase (0-10s)
2. Dough preparation (10-25s)
3. Rolling and cutting (25-45s)
4. Cooking and plating (45-60s)

Performance Metrics:
- Views: 127,439
- Likes: 8,234
- Comments: 892
- Shares: 1,247
- Saves: 3,156
- Engagement Rate: 10.7%

Trending Elements:
- Audio: "Cooking with Amore" (trending sound)
- Text overlay: Step-by-step instructions
- Transitions: Quick cuts synchronized with beat drops
- Hook: "You've been making pasta wrong your whole life!"

Audience Engagement:
Comments include recipe requests, cooking tips, and users tagging friends. High save rate indicates content value for future reference.
    `,
    metadata: {
      domain: 'instagram' as Domain,
      source: 'instagram_api',
      contentType: 'post',
      createdAt: '2024-01-20T14:15:00Z',
      updatedAt: '2024-01-20T14:15:00Z',
      tags: ['instagram', 'cooking', 'recipe', 'pasta', 'tutorial', 'reel'],
      type: 'instagram_reel',
      postId: 'instagram-post-2',
      mediaType: 'video',
      likesCount: 8234,
      commentsCount: 892,
      engagementRate: 10.7,
      hashtags: ['cooking', 'pasta', 'recipe', 'homemade', 'italian', 'tutorial', 'food']
    }
  },
  {
    id: 'instagram-story-1',
    content: `
Instagram Story Analysis: Behind-the-Scenes Content

This story series provides behind-the-scenes content from a product photoshoot, showing the setup, lighting, and creative process. Stories include polls, questions, and swipe-up links to drive engagement.

Story Elements:
1. Setup shot with lighting equipment
2. Product arrangement process
3. Poll: "Which angle looks better?"
4. Question sticker: "What products should I shoot next?"
5. Final result with swipe-up link

Interactive Features:
- Poll responses: 1,247 votes (67% chose option A)
- Question responses: 89 replies
- Link clicks: 234 (18.7% click-through rate)
- Story completion rate: 78%

Performance Insights:
Stories with interactive elements showed 34% higher completion rates compared to static content. The behind-the-scenes approach generated authentic engagement and built stronger audience connection.

Business Impact:
- Website traffic increase: 23%
- Product page views: +156
- Email signups: 34 new subscribers
- Direct messages: 67 inquiries about services
    `,
    metadata: {
      domain: 'instagram' as Domain,
      source: 'instagram_api',
      contentType: 'post',
      createdAt: '2024-01-22T10:30:00Z',
      updatedAt: '2024-01-22T10:30:00Z',
      tags: ['instagram', 'story', 'behind-the-scenes', 'product', 'photography', 'interactive'],
      type: 'instagram_story',
      storyId: 'instagram-story-1',
      mediaType: 'mixed',
      views: 2847,
      interactions: 1425,
      completionRate: 78
    }
  }
];

// Sample data by domain for targeted testing
export const getSampleDataByDomain = (domain: Domain): Document[] => {
  return sampleInstagramData.filter(doc => doc.metadata.domain === domain);
};

export const testQueries = {
  fitness: [
    "What are the best HIIT workout routines?",
    "How to build muscle effectively?",
    "What are good nutrition tips for fitness?",
    "How to improve cardiovascular health?"
  ],
  trading: [
    "What are the best crypto trading strategies?",
    "How to manage risk in trading?",
    "What is DeFi yield farming?",
    "How to analyze market trends?"
  ],
  general: [
    "What are Wing Chun techniques?",
    "How to practice Chi-Sao?",
    "What is the philosophy of martial arts?",
    "How to defend against knife attacks?"
  ],
  instagram: [
    "What are the best Instagram engagement strategies?",
    "How to create viral content?",
    "What are effective hashtag strategies?",
    "How to improve Instagram reach?"
  ]
};

export default {
  sampleInstagramData,
  getSampleDataByDomain,
  testQueries
}; 