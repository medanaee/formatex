export type Lang = "fa" | "en"

export const REPO = "https://github.com/medanaee/formatex"
export const RELEASES = `${REPO}/releases/latest`

export interface Copy {
  name: string
  nav: { how: string; components: string; forge: string; download: string }
  lens: {
    name: string
    title: string
    /** [before, highlighted, after] */
    sub: [string, string, string]
    /** [before, chip, after]; the source shows the chip as an alert tag */
    lead: [string, string, string]
    alert: string
    steps: [string, string, string]
    platforms: string[]
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
    prev: string
    next: string
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
  refs: {
    eyebrow: string
    title: string
    text: string
    hint: string
    pages: { tag: string; name: string }[]
  }
  library: {
    eyebrow: string
    title: string
    text: string
    themes: string[]
    feelTitle: string
    feels: { name: string; note: string }[]
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
      name: "Formatex",
      title: "Write the text,",
      sub: ["we set the ", "page.", ""],
      lead: ["Persian and ", "English", " side by side, with an exact PDF."],
      alert: "no fuss",
      steps: ["Write", "See", "Export"],
      platforms: ["Windows", "macOS", "Linux", "Android"],
      hint: "Scroll: the page turns into its source",
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
      hint: "Each preview is rendered by the engine of the app, in the midnight theme.",
      prev: "Previous",
      next: "Next",
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
    refs: {
      eyebrow: "Documents",
      title: "Contents, lists and references, done for you.",
      text: "Write a tag once. The numbers, the page numbers, the links and the bibliography follow the text as it changes, and every reference is a link in the PDF.",
      hint: "Hover a page (or tap it) to see the tags",
      pages: [
        { tag: "<toc>", name: "Table of contents" },
        { tag: "<lof> <lot> <lol>", name: "Lists of figures, tables and listings" },
        { tag: "<ref> <cite> <bibliography>", name: "Cross-references and citations" },
      ],
    },
    library: {
      eyebrow: "Themes",
      title: "One page, eight themes, three feels.",
      text: "A theme is nine colors; a feel is the shape: the corners and the fonts. Everything on the page follows both: headings, alerts, charts, tables and code. This is one real page, set by the engine of the app every way. Turn the dial, then pick a feel.",
      themes: ["Paper", "Sepia", "Ocean", "Sage", "Midnight", "Nord", "Zinc", "Dracula"],
      feelTitle: "Feel",
      feels: [
        { name: "Formal", note: "Square corners, book type" },
        { name: "Standard", note: "Slightly rounded, Inter" },
        { name: "Friendly", note: "Soft and round, Lexend" },
      ],
    },
    final: { title: "Free, open source, and on your device.", text: "Download the latest version from GitHub.", platforms: "Windows · macOS · Linux · Android" },
    footer: "Built with Tauri and Typst.",
    toggles: { language: "فارسی" },
  },
  fa: {
    name: "فرمتکس",
    nav: { how: "چطور کار می‌کند", components: "کامپوننت‌ها", forge: "مال خودتان", download: "دانلود" },
    lens: {
      name: "فرمتکس",
      title: "نوشته را بنویس،",
      sub: ["صفحه را ", "ما", " می‌چینیم."],
      lead: ["فارسی و ", "English", " کنار هم، با خروجی PDF دقیق."],
      alert: "بدون دردسر",
      steps: ["بنویس", "ببین", "خروجی بگیر"],
      platforms: ["ویندوز", "مک", "لینوکس", "اندروید"],
      hint: "اسکرول کنید: صفحه به منبعش تبدیل می‌شود",
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
      hint: "هر پیش‌نمایش را موتور خود اپ، با تم نیمه‌شب، ساخته است.",
      prev: "قبلی",
      next: "بعدی",
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
    refs: {
      eyebrow: "سند",
      title: "فهرست، ارجاع و منبع، خودکار.",
      text: "یک تگ را یک بار می‌نویسید. شماره‌ها، شماره‌ی صفحه‌ها، پیوندها و فهرست منابع با تغییر متن به‌روز می‌شوند و هر ارجاع در PDF یک پیوند است.",
      hint: "روی یک صفحه بروید (یا لمسش کنید) تا تگ‌ها را ببینید",
      pages: [
        { tag: "<toc>", name: "فهرست مطالب" },
        { tag: "<lof> <lot> <lol>", name: "فهرست شکل‌ها، جدول‌ها و کدها" },
        { tag: "<ref> <cite> <bibliography>", name: "ارجاع و استناد" },
      ],
    },
    library: {
      eyebrow: "تم‌ها",
      title: "یک صفحه، هشت تم، سه حس.",
      text: "تم نُه رنگ است و حس (feel) شکل: گوشه‌ها و فونت‌ها. هر چیز روی صفحه از هر دو پیروی می‌کند: تیترها، هشدارها، نمودارها، جدول‌ها و کد. این یک صفحه‌ی واقعی است که موتور خود اپ به هر شکل ساخته است. دکمه را بچرخانید و یک حس انتخاب کنید.",
      themes: ["کاغذ", "سپیا", "اقیانوس", "مریم‌گلی", "نیمه‌شب", "نُرد", "زینک", "دراکولا"],
      feelTitle: "حس",
      feels: [
        { name: "رسمی", note: "گوشه‌های تیز، قلم کتابی" },
        { name: "استاندارد", note: "کمی گرد، Inter" },
        { name: "دوستانه", note: "گرد و نرم، Lexend" },
      ],
    },
    final: { title: "رایگان، متن‌باز و روی دستگاه شما.", text: "آخرین نسخه را از GitHub بگیرید.", platforms: "ویندوز · مک · لینوکس · اندروید" },
    footer: "ساخته‌شده با Tauri و Typst.",
    toggles: { language: "English" },
  },
}
