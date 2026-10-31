export type Lang = "fa" | "en"

export const REPO = "https://github.com/medanaee/formatex"
export const RELEASES = `${REPO}/releases/latest`

export type ComponentKey = "alert" | "chart" | "grid" | "tree" | "table" | "steps" | "code"

export interface Copy {
  name: string
  nav: { how: string; components: string; forge: string; download: string }
  lens: {
    kicker: string
    title: string
    /** [before, highlighted, after] */
    sub: [string, string, string]
    /** [before, chip, after]; the source shows the chip as an alert tag */
    lead: [string, string, string]
    alert: string
    hint: string
    download: string
    source: string
  }
  studio: {
    eyebrow: string
    title: [string, string]
    text: string
    edit: string
    preview: string
    files: string
    export: string
    compiled: string
    hover: string
    doc: { title: string; body: string; alert: string; caption: string; rows: [string, string][] }
  }
  wall: {
    eyebrow: string
    count: string
    title: string
    text: string
    hint: string
    cards: {
      alerts: [string, string, string, string]
      steps: [string, string, string]
      pros: [string, string]
      cons: string
      theorem: { name: string; text: string }
      chat: { user: string; ai: string }
      todo: string
      rating: string
    }
  }
  forge: {
    eyebrow: string
    title: string
    text: string
    themeTitle: string
    themeText: string
    hue: string
    type: string
    tokens: string[]
    componentTitle: string
    componentText: string
    label: string
    stamp: string
    sample: { title: string; body: string }
  }
  library: {
    eyebrow: string
    title: string
    text: string
    count: string
    pick: string
    themes: string[]
    sheet: { title: string; body: string }
    parts: {
      info: string
      warn: string
      chart: { caption: string; labels: string[]; values: string[] }
      grid: { title: string; text: string }[]
      table: { caption: string; head: [string, string]; rows: [string, string][] }
      steps: string[]
    }
  }
  final: { title: string; text: string; platforms: string }
  footer: string
  toggles: { language: string }
}

/** Both languages, written for the same layout. English is the default; the page flips its direction with the language. */
export const COPY: Record<Lang, Copy> = {
  en: {
    name: "Formatex",
    nav: { how: "How it works", components: "Components", forge: "Make it yours", download: "Download" },
    lens: {
      kicker: "Markdown to exact bilingual PDF",
      title: "Write the text,",
      sub: ["we set the ", "page.", ""],
      lead: ["Persian and ", "English", " side by side, with an exact PDF."],
      alert: "no fuss",
      hint: "Move the lens to see the source",
      download: "Download",
      source: "Source code",
    },
    studio: {
      eyebrow: "How it works",
      title: ["Write on one side,", "see the page on the other."],
      text: "The editor and the preview sit side by side. Every change is typeset at once, and a click on the page takes you to its line.",
      edit: "Edit",
      preview: "Preview",
      files: "Files",
      export: "Export PDF",
      compiled: "Compiled in 0.4 s",
      hover: "Hover a line or a block: they find each other.",
      doc: {
        title: "Q3 report",
        body: "Results match Excel and Python: 12% growth, most of it from the home market.",
        alert: "Check the page numbers before you print.",
        caption: "Sales by season",
        rows: [["Spring", "12"], ["Summer", "16"], ["Autumn", "9"]],
      },
    },
    wall: {
      eyebrow: "Components",
      count: "70+",
      title: "tags, ready to use.",
      text: "Callouts, charts, trees, diffs, theorems, chats, letters and quizzes: each one is a tag you write in the text, and each one follows the theme of the page.",
      hint: "Hover a card to see its tag",
      cards: {
        alerts: ["Info", "Tip", "Warning", "Danger"],
        steps: ["Write", "Check", "Export"],
        pros: ["Fast", "Offline"],
        cons: "Large file",
        theorem: { name: "Theorem 1.", text: "Every page has a number." },
        chat: { user: "Can you make a table?", ai: "Done. It is on page 3." },
        todo: "Add the cover page",
        rating: "Rating",
      },
    },
    forge: {
      eyebrow: "Make it yours",
      title: "Your own themes. Your own components.",
      text: "Both are yours to define. A theme is nine colors; a component is one small file. The page below changes as you move.",
      themeTitle: "A theme",
      themeText: "Nine tokens (background, text, heading, muted, accent, secondary, rule and the two code colors), and every component follows them.",
      hue: "Accent hue",
      type: "Type here, the stamp follows",
      tokens: ["bg", "fg", "heading", "muted", "accent", "secondary", "rule", "code-bg", "code-stroke"],
      componentTitle: "A component",
      componentText: "A file that exports a tag. It gets the attributes and the body, and the whole theme.",
      label: "Stamp text",
      stamp: "APPROVED",
      sample: { title: "Q3 report", body: "Your colors, your tags, the same exact PDF." },
    },
    library: {
      eyebrow: "Components",
      title: "Components, one tag each.",
      text: "Switch a few on, turn the theme dial, and the page builds right here. In Formatex every one of them is a single tag, and you can make your own.",
      count: "components",
      pick: "Pick a tag",
      themes: ["Paper", "Sepia", "Ocean", "Sage", "Midnight", "Nord", "Zinc", "Dracula"],
      sheet: { title: "Q3 report", body: "Results match Excel and Python: 12% growth over last quarter, most of it from the home market." },
      parts: {
        info: "Pages are numbered from the cover.",
        warn: "Check the page numbers before you print.",
        chart: { caption: "Figure 1: Sales by season", labels: ["Spring", "Summer", "Autumn", "Winter"], values: ["12", "16", "9", "14"] },
        grid: [
          { title: "Growth", text: "12% over last quarter" },
          { title: "Clients", text: "48 active" },
          { title: "Cities", text: "3 markets" },
        ],
        table: { caption: "Table 1: Sales", head: ["Quarter", "Sales"], rows: [["Spring", "120"], ["Summer", "168"], ["Autumn", "94"]] },
        steps: ["Write the text", "Check the preview", "Export the PDF"],
      },
    },
    final: { title: "Free, open source, and on your device.", text: "Download the latest version from GitHub.", platforms: "Windows · macOS · Linux · Android" },
    footer: "Built with Tauri and Typst.",
    toggles: { language: "فارسی" },
  },
  fa: {
    name: "فرمتکس",
    nav: { how: "چطور کار می‌کند", components: "کامپوننت‌ها", forge: "مال خودتان", download: "دانلود" },
    lens: {
      kicker: "مارک‌داون به PDF دوزبانه‌ی دقیق",
      title: "نوشته را بنویس،",
      sub: ["صفحه را ", "ما", " می‌چینیم."],
      lead: ["فارسی و ", "English", " کنار هم، با خروجی PDF دقیق."],
      alert: "بدون دردسر",
      hint: "ذره‌بین را حرکت دهید تا منبع را ببینید",
      download: "دانلود",
      source: "کد منبع",
    },
    studio: {
      eyebrow: "چطور کار می‌کند",
      title: ["یک طرف بنویس،", "طرف دیگر صفحه را ببین."],
      text: "ویرایشگر و پیش‌نمایش کنار هم‌اند. هر تغییر همان لحظه حروف‌چینی می‌شود و کلیک روی صفحه شما را به همان خط می‌برد.",
      edit: "ویرایش",
      preview: "پیش‌نمایش",
      files: "فایل‌ها",
      export: "خروجی PDF",
      compiled: "ساخته شد در ۰٫۴ ثانیه",
      hover: "روی یک خط یا یک بلوک بروید: همدیگر را پیدا می‌کنند.",
      doc: {
        title: "گزارش فصل سوم",
        body: "نتایج با Excel و Python هم‌خوان بود؛ ۱۲٪ رشد، و بیشترِ آن از بازار داخلی.",
        alert: "پیش از چاپ، شماره‌ی صفحه‌ها را بازبینی کنید.",
        caption: "فروش به تفکیک فصل",
        rows: [["بهار", "۱۲"], ["تابستان", "۱۶"], ["پاییز", "۹"]],
      },
    },
    wall: {
      eyebrow: "کامپوننت‌ها",
      count: "+۷۰",
      title: "تگ آماده.",
      text: "کادر هشدار، نمودار، درخت، مقایسه، قضیه، گفتگو، نامه و آزمون: هر کدام یک تگ است که در متن می‌نویسید و از تم صفحه پیروی می‌کند.",
      hint: "روی هر کارت بروید تا تگش را ببینید",
      cards: {
        alerts: ["اطلاعات", "نکته", "هشدار", "خطر"],
        steps: ["بنویس", "ببین", "خروجی"],
        pros: ["سریع", "آفلاین"],
        cons: "حجم زیاد",
        theorem: { name: "قضیه ۱.", text: "هر صفحه یک شماره دارد." },
        chat: { user: "یک جدول می‌سازی؟", ai: "انجام شد. در صفحه‌ی ۳ است." },
        todo: "صفحه‌ی جلد را اضافه کن",
        rating: "امتیاز",
      },
    },
    forge: {
      eyebrow: "مال خودتان کنید",
      title: "تم و کامپوننت خودتان را بسازید.",
      text: "هر دو را خودتان تعریف می‌کنید. تم نُه رنگ است و کامپوننت یک فایل کوچک. صفحه‌ی زیر همراه شما عوض می‌شود.",
      themeTitle: "یک تم",
      themeText: "نُه نشانه (پس‌زمینه، متن، تیتر، کم‌رنگ، تأکید، ثانویه، خط و دو رنگ کد) و همه‌ی کامپوننت‌ها از آن‌ها پیروی می‌کنند.",
      hue: "طیف رنگ تأکید",
      type: "اینجا بنویسید، مهر همراهتان می‌شود",
      tokens: ["bg", "fg", "heading", "muted", "accent", "secondary", "rule", "code-bg", "code-stroke"],
      componentTitle: "یک کامپوننت",
      componentText: "فایلی که یک تگ را صادر می‌کند. ویژگی‌ها و بدنه و کل تم را می‌گیرد.",
      label: "متن مهر",
      stamp: "تأیید شد",
      sample: { title: "گزارش فصل سوم", body: "رنگ‌های شما، تگ‌های شما، همان PDF دقیق." },
    },
    library: {
      eyebrow: "کامپوننت‌ها",
      title: "هر کامپوننت، یک تگ.",
      text: "چند تا را روشن کنید، دکمه‌ی تم را بچرخانید و صفحه همین‌جا ساخته می‌شود. در فرمتکس هر کدام فقط یک تگ است و کامپوننت خودتان را هم می‌سازید.",
      count: "کامپوننت",
      pick: "یک تگ را انتخاب کنید",
      themes: ["کاغذ", "سپیا", "اقیانوس", "مریم‌گلی", "نیمه‌شب", "نُرد", "زینک", "دراکولا"],
      sheet: { title: "گزارش فصل سوم", body: "نتایج با Excel و Python هم‌خوان بود؛ ۱۲٪ رشد نسبت به فصل پیش، و بیشترِ آن از بازار داخلی." },
      parts: {
        info: "شماره‌ی صفحه‌ها از جلد شروع می‌شود.",
        warn: "پیش از چاپ، شماره‌ی صفحه‌ها را بازبینی کنید.",
        chart: { caption: "شکل ۱: فروش به تفکیک فصل", labels: ["بهار", "تابستان", "پاییز", "زمستان"], values: ["۱۲", "۱۶", "۹", "۱۴"] },
        grid: [
          { title: "رشد", text: "۱۲٪ نسبت به فصل پیش" },
          { title: "مشتری", text: "۴۸ فعال" },
          { title: "شهر", text: "۳ بازار" },
        ],
        table: { caption: "جدول ۱: فروش", head: ["فصل", "فروش"], rows: [["بهار", "۱۲۰"], ["تابستان", "۱۶۸"], ["پاییز", "۹۴"]] },
        steps: ["متن را بنویسید", "پیش‌نمایش را ببینید", "PDF را بگیرید"],
      },
    },
    final: { title: "رایگان، متن‌باز و روی دستگاه شما.", text: "آخرین نسخه را از GitHub بگیرید.", platforms: "ویندوز · مک · لینوکس · اندروید" },
    footer: "ساخته‌شده با Tauri و Typst.",
    toggles: { language: "English" },
  },
}
