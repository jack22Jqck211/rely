Deno.serve({ port: Number(Deno.env.get("PORT")) || 8000 }, async (req) => {
  const u = new URL(req.url);

  // ۱. صفحه اصلی شیک و مدرن برای مسیر اصلی
  if (u.pathname === "/" && !req.headers.has("x-host")) {
    const html = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reverse Proxy Service</title>
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;500;800&display=swap" rel="stylesheet">
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Vazirmatn', sans-serif;
                background: radial-gradient(circle at center, #1a1a2e 0%, #0f0f1b 100%);
                color: #ffffff;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                overflow: hidden;
            }
            .container {
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 24px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 90%;
                animation: fadeIn 1s ease-out;
            }
            .icon {
                font-size: 64px;
                margin-bottom: 20px;
                background: linear-gradient(45deg, #00ffcc, #0077ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            h1 {
                margin: 0 0 10px 0;
                font-size: 2.5rem;
                font-weight: 800;
                letter-spacing: -1px;
            }
            p {
                color: #8b9bb4;
                font-size: 1.1rem;
                line-height: 1.6;
                margin-bottom: 30px;
                font-weight: 300;
            }
            .status {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(0, 255, 204, 0.1);
                color: #00ffcc;
                padding: 8px 16px;
                border-radius: 50px;
                font-size: 0.9rem;
                font-weight: 500;
                border: 1px solid rgba(0, 255, 204, 0.2);
            }
            .pulse {
                width: 8px;
                height: 8px;
                background-color: #00ffcc;
                border-radius: 50%;
                box-shadow: 0 0 10px #00ffcc;
                animation: pulse-animation 1.5s infinite;
            }
            @keyframes pulse-animation {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 204, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 255, 204, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 204, 0); }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">⚡</div>
            <h1>پروکسی سرور فعال است</h1>
            <p>سرویس انتقال ترافیک با موفقیت روی پلتفرم Railway مستقر شد و آماده پردازش درخواست‌های شماست.</p>
            <div class="status">
                <div class="pulse"></div>
                <span>سیستم کاملاً پایدار است</span>
            </div>
        </div>
    </body>
    </html>
    `;
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=UTF-8" },
    });
  }

  // ۲. بخش پروکسی (کد قبلی شما با کمی بهینه‌سازی)
  const blockedKeys = [
    "host", "connection", "keep-alive", "proxy-authenticate", 
    "proxy-authorization", "te", "trailer", "transfer-encoding", 
    "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", 
    "x-forwarded-port"
  ];
  
  const t = req.headers.get("x-host");
  if (!t) return new Response("OK", { status: 200 });

  const isSecure = !t.includes(":") || t.includes(":443") || /^s\d+\./.test(t);
  const base = t.startsWith("http") ? t : (isSecure ? "https://" : "http://") + t;
  const full = base + u.pathname + u.search;
  
  const h = new Headers();
  let ip = null;

  req.headers.forEach((v, k) => {
    const kk = k.toLowerCase();
    if (blockedKeys.includes(kk) || kk === "x-host") return;
    if (kk === "x-real-ip") { ip = v; return; }
    if (kk === "x-forwarded-for") { if (!ip) ip = v; return; }
    h.set(kk, v);
  });

  if (ip) h.set("x-forwarded-for", ip);

  try {
    const r = await fetch(full, {
      method: req.method,
      headers: h,
      redirect: "manual",
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body
    });

    const oh = new Headers();
    r.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "transfer-encoding") oh.set(k, v);
    });

    return new Response(r.body, { status: r.status, headers: oh });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
});
