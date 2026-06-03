import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { z } from "zod";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

const generateSchema = z.object({
  productId: z.string(),
  prompt: z.string().optional(),
});

export const POST: APIRoute = async (context) => {
  try {
    // 1. Verify seller role
    const user = context.locals.user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse input
    const body = await context.request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input tidak valid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { productId, prompt = "" } = parsed.data;

    // 3. Verify product belongs to user
    const db = getDb(env);
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .get();

    if (!product || (product.sellerId !== user.id && user.role !== "ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Produk tidak ditemukan atau bukan milik Anda" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    let generatedData: any = null;
    
    // System Prompt for AI Generation
    const systemPrompt = `Anda adalah Landing Page Copywriter profesional berbahasa Indonesia yang berspesialisasi dalam produk digital.
Tugas Anda adalah membuat copywriting landing page dengan tingkat konversi tinggi (high conversion) dalam format JSON yang valid.
Gunakan data produk berikut:
Judul Produk: ${product.title}
Deskripsi Produk: ${product.description}
Permintaan Khusus Seller: ${prompt}

Format JSON output harus persis seperti berikut (jangan ada markdown block, jangan ada teks pembuka/penutup, hanya JSON valid):
{
  "title": "Judul SEO Landing Page",
  "subtitle": "Subjudul persuasif",
  "heroTitle": "Judul Utama Hero Section yang Menggigit",
  "heroSubtitle": "Subjudul detail di Hero Section",
  "heroFeatures": ["Benefit 1 (singkat)", "Benefit 2 (singkat)", "Benefit 3 (singkat)"],
  "features": [
    {"title": "Nama Keunggulan 1", "description": "Penjelasan detail keunggulan 1", "icon": "zap|award|shield|cpu|users|book-open|star"},
    {"title": "Nama Keunggulan 2", "description": "Penjelasan detail keunggulan 2", "icon": "zap|award|shield|cpu|users|book-open|star"},
    {"title": "Nama Keunggulan 3", "description": "Penjelasan detail keunggulan 3", "icon": "zap|award|shield|cpu|users|book-open|star"},
    {"title": "Nama Keunggulan 4", "description": "Penjelasan detail keunggulan 4", "icon": "zap|award|shield|cpu|users|book-open|star"}
  ],
  "testimonials": [
    {"name": "Nama Pembeli 1", "role": "Pekerjaan/Peran", "content": "Testimoni jujur dan sangat positif tentang produk ini.", "rating": 5},
    {"name": "Nama Pembeli 2", "role": "Pekerjaan/Peran", "content": "Testimoni jujur dan sangat positif tentang produk ini.", "rating": 5},
    {"name": "Nama Pembeli 3", "role": "Pekerjaan/Peran", "content": "Testimoni jujur dan sangat positif tentang produk ini.", "rating": 5}
  ],
  "faqs": [
    {"question": "Pertanyaan 1 tentang produk/akses?", "answer": "Jawaban lengkap 1"},
    {"question": "Pertanyaan 2 tentang cara pakai?", "answer": "Jawaban lengkap 2"},
    {"question": "Pertanyaan 3 tentang garansi/update?", "answer": "Jawaban lengkap 3"},
    {"question": "Pertanyaan 4 tentang kecocokan pemula?", "answer": "Jawaban lengkap 4"}
  ]
}`;

    // 4. Try Cloudflare Workers AI
    if (env.AI) {
      try {
        const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate landing page copy for: "${product.title}" based on the prompt: "${prompt}"` }
          ]
        });

        let textResult = "";
        if (typeof aiResponse === "string") {
          textResult = aiResponse;
        } else if (aiResponse && typeof aiResponse === "object" && 'response' in aiResponse) {
          textResult = (aiResponse as any).response;
        } else {
          textResult = JSON.stringify(aiResponse);
        }

        // Clean any potential markdown wrapper
        const startIdx = textResult.indexOf("{");
        const endIdx = textResult.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = textResult.substring(startIdx, endIdx + 1);
          generatedData = JSON.parse(jsonStr);
        }
      } catch (aiErr) {
        console.error("Cloudflare Workers AI failed, utilizing rule-based copy generator:", aiErr);
      }
    }

    // 5. Fallback rule-based generator
    if (!generatedData) {
      generatedData = fallbackGenerate(product.title, product.description, prompt);
    }

    return new Response(
      JSON.stringify({ success: true, data: generatedData }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal mendelegasikan content generation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Gagal membuat konten landing page" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

function fallbackGenerate(productTitle: string, productDesc: string, sellerPrompt: string) {
  const promptLower = sellerPrompt.toLowerCase();
  const descLower = productDesc.toLowerCase();
  const titleLower = productTitle.toLowerCase();
  
  let isCourse = titleLower.includes("course") || titleLower.includes("kursus") || descLower.includes("video") || descLower.includes("kelas");
  let isTemplate = titleLower.includes("template") || titleLower.includes("sheet") || titleLower.includes("desain") || descLower.includes("template");
  let isPreset = titleLower.includes("preset") || titleLower.includes("lrtemplate");

  let typeName = "Produk Digital";
  let icon1 = "zap", icon2 = "award", icon3 = "shield", icon4 = "cpu";
  
  if (isCourse) {
    typeName = "Kursus Online";
    icon1 = "book-open";
    icon2 = "users";
    icon3 = "award";
    icon4 = "cpu";
  } else if (isTemplate) {
    typeName = "Template Siap Pakai";
    icon1 = "zap";
    icon2 = "shield";
    icon3 = "cpu";
    icon4 = "award";
  } else if (isPreset) {
    typeName = "Preset Premium";
    icon1 = "zap";
    icon2 = "star";
    icon3 = "award";
    icon4 = "shield";
  } else if (titleLower.includes("book") || titleLower.includes("buku") || titleLower.includes("panduan")) {
    typeName = "E-book Panduan";
    icon1 = "book-open";
    icon2 = "zap";
    icon3 = "shield";
    icon4 = "award";
  }

  // Adjust content based on prompt instructions
  const defaultFeatures = [
    {
      title: isCourse ? "Kurikulum Terstruktur" : "Desain Premium & Profesional",
      description: isCourse 
        ? "Materi disusun secara sistematis dari dasar hingga mahir untuk memudahkan pemahaman Anda secara bertahap." 
        : "Dibuat dengan standar kualitas tinggi, estetika modern, dan teruji untuk hasil terbaik bagi proyek Anda.",
      icon: icon1
    },
    {
      title: "Efisiensi Waktu Maksimal",
      description: "Lompati proses pembuatan yang memakan waktu berhari-hari. Dapatkan hasil instan berkualitas profesional dalam hitungan menit.",
      icon: icon2
    },
    {
      title: isCourse ? "Studi Kasus & Project Riil" : "Mudah Disesuaikan (Customizable)",
      description: isCourse
        ? "Praktek langsung membangun proyek nyata yang bisa dijadikan portofolio berharga Anda."
        : "File master sangat fleksibel dan mudah diedit sesuai dengan kebutuhan personal atau bisnis Anda.",
      icon: icon3
    },
    {
      title: "Dukungan & Update Selamanya",
      description: "Dapatkan pembaruan file atau materi secara berkala tanpa biaya tambahan, serta akses ke komunitas support.",
      icon: icon4
    }
  ];

  const defaultTestimonials = [
    {
      name: "Budi Setiawan",
      role: "Freelance Designer",
      content: `Sangat membantu pekerjaan saya! File ${productTitle} ini kualitasnya sangat luar biasa dan menghemat waktu saya hingga 80%. Sangat direkomendasikan!`,
      rating: 5
    },
    {
      name: "Indah Permata",
      role: "Digital Entrepreneur",
      content: `Kualitas materi/aset di dalam ${productTitle} benar-benar premium. Pembahasannya juga sangat jelas. Investasi terbaik saya tahun ini!`,
      rating: 5
    },
    {
      name: "Riko Sanjaya",
      role: "Profesional Developer",
      content: `Awalnya ragu untuk beli, tapi setelah download dan mencobanya sendiri, ternyata jauh melebihi ekspektasi. Seller juga sangat responsif saat ditanya.`,
      rating: 5
    }
  ];

  const defaultFaqs = [
    {
      question: "Bagaimana cara pengiriman produk digital ini?",
      answer: "Setelah transaksi sukses dan terkonfirmasi, Anda akan langsung diarahkan ke halaman download. Kami juga akan mengirimkan link download unik ke email Anda."
    },
    {
      question: "Apakah ada batasan akses atau batasan download?",
      answer: "Untuk keamanan sistem, download dibatasi 3 kali dalam 24 jam. Namun, Anda memiliki akses permanen di tab 'Library' akun Prodig Anda selama login."
    },
    {
      question: "Apakah saya bisa mendapatkan update gratis?",
      answer: "Ya! Setiap kali seller memperbarui isi produk digital ini, Anda akan menerima update materi secara gratis tanpa biaya tambahan."
    },
    {
      question: "Apakah ada grup diskusi atau support?",
      answer: "Tentu saja! Anda akan terhubung dengan pembeli lain dan seller melalui grup support eksklusif kami untuk diskusi."
    }
  ];

  return {
    title: `${productTitle} - ${typeName} Premium`,
    subtitle: `Tingkatkan produktivitas dan hasil kerja Anda dengan ${productTitle} berkualitas tinggi.`,
    heroTitle: `Kuasai dan Selesaikan Pekerjaan Anda Lebih Cepat dengan ${productTitle}!`,
    heroSubtitle: `Solusi terbaik yang dirancang khusus untuk membantu Anda mencapai hasil maksimal dengan efisien, praktis, dan instan.`,
    heroFeatures: ["Akses Instan & Selamanya", "Update Gratis Berkala", "100% Transaksi Aman"],
    features: defaultFeatures,
    testimonials: defaultTestimonials,
    faqs: defaultFaqs
  };
}
