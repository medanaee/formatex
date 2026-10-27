export type Lang = "fa" | "en"

export const REPO = "https://github.com/medanaee/formatex"
export const RELEASES = `${REPO}/releases/latest`

export interface Copy {
  name: string
  nav: { features: string; how: string; download: string }
  hero: { title: string; lead: string; download: string; source: string; platforms: string }
  featuresTitle: string
  features: { icon: "languages" | "eye" | "blocks" | "palette" | "pen" | "hard-drive"; title: string; text: string }[]
  howTitle: string
  steps: { title: string; text: string }[]
  downloadTitle: string
  downloadText: string
  platforms: { name: string; note: string }[]
  getIt: string
  footer: string
  toggles: { language: string; theme: string }
}

/** Both languages, written for the same layout. Persian is the default; the page flips its direction with it. */
export const COPY: Record<Lang, Copy> = {
  fa: {
    name: "فرمتکس",
    nav: { features: "ویژگی‌ها", how: "چطور کار می‌کند", download: "دانلود" },
    hero: {
      title: "مارک‌داون را به PDF دوزبانه‌ی دقیق تبدیل کنید",
      lead: "فرمتکس متن شما را با موتور Typst حروف‌چینی می‌کند: فارسی و انگلیسی، راست‌چین و چپ‌چین، کنار هم و بدون دردسر. ویرایشگر، پیش‌نمایش زنده و خروجی PDF در یک برنامه‌ی سبک.",
      download: "دانلود برنامه",
      source: "کد منبع",
      platforms: "ویندوز · مک · لینوکس · اندروید",
    },
    featuresTitle: "هر چه برای یک سند خوب لازم است",
    features: [
      { icon: "languages", title: "فارسی و انگلیسی با هم", text: "جهت هر پاراگراف از روی خودش تشخیص داده می‌شود؛ ارقام، فهرست‌ها و ارجاع‌ها هم فارسی‌اند." },
      { icon: "eye", title: "پیش‌نمایش زنده", text: "هر تغییر همان لحظه حروف‌چینی می‌شود. روی متن کلیک کنید تا به همان خط بروید." },
      { icon: "blocks", title: "کامپوننت‌ها", text: "تگ‌هایی مثل alert، chart، grid و tree. کامپوننت‌های خودتان را هم می‌سازید." },
      { icon: "palette", title: "تم و ظاهر", text: "تم‌های آماده و تم‌های شخصی، با رنگ و اندازه‌ای که خودتان انتخاب می‌کنید." },
      { icon: "pen", title: "ویرایشگر بصری", text: "جدول، تیتر و تنظیمات را همان‌جا ویرایش کنید؛ خطای هر خط را روی خودش ببینید." },
      { icon: "hard-drive", title: "آفلاین و روی دستگاه", text: "همه‌چیز روی دستگاه شما می‌ماند. برنامه‌ی بومی است، نه یک سایت." },
    ],
    howTitle: "سه قدم تا PDF",
    steps: [
      { title: "بنویسید", text: "مارک‌داون ساده، با تگ‌هایی که فقط وقتی لازم است می‌آیند." },
      { title: "ببینید", text: "پیش‌نمایش صفحه‌ها کنار متن، با لینک‌های واقعی." },
      { title: "خروجی بگیرید", text: "یک PDF آماده‌ی چاپ و ارسال، با فونت‌های همراه برنامه." },
    ],
    downloadTitle: "دانلود",
    downloadText: "رایگان و متن‌باز. آخرین نسخه را از GitHub بگیرید.",
    platforms: [
      { name: "ویندوز", note: "نصب‌کننده‌ی .exe و .msi" },
      { name: "مک", note: "فایل .dmg" },
      { name: "لینوکس", note: ".AppImage، .deb و .rpm" },
      { name: "اندروید", note: "فایل .apk برای هر معماری" },
    ],
    getIt: "آخرین نسخه",
    footer: "ساخته‌شده با Tauri و Typst.",
    toggles: { language: "English", theme: "تغییر تم" },
  },
  en: {
    name: "Formatex",
    nav: { features: "Features", how: "How it works", download: "Download" },
    hero: {
      title: "Turn Markdown into exact bilingual PDFs",
      lead: "Formatex typesets your text with the Typst engine: Persian and English, right-to-left and left-to-right, side by side without the fuss. An editor, a live preview and PDF export in one light app.",
      download: "Download the app",
      source: "Source code",
      platforms: "Windows · macOS · Linux · Android",
    },
    featuresTitle: "Everything a good document needs",
    features: [
      { icon: "languages", title: "Persian and English together", text: "Each paragraph finds its own direction; digits, lists and references follow the language." },
      { icon: "eye", title: "Live preview", text: "Every change is typeset at once. Click the text to jump to its line in the source." },
      { icon: "blocks", title: "Components", text: "Tags like alert, chart, grid and tree. Make components of your own too." },
      { icon: "palette", title: "Themes and looks", text: "Ready-made themes and your own, with the colors and sizes you choose." },
      { icon: "pen", title: "Visual editor", text: "Edit tables, headings and settings in place; see the problem of a line on the line itself." },
      { icon: "hard-drive", title: "Offline, on your device", text: "Everything stays on your device. It is a native app, not a website." },
    ],
    howTitle: "Three steps to a PDF",
    steps: [
      { title: "Write", text: "Plain Markdown, with tags only where you need them." },
      { title: "See", text: "The pages beside the text, with working links." },
      { title: "Export", text: "A PDF ready to print and send, with the fonts the app brings." },
    ],
    downloadTitle: "Download",
    downloadText: "Free and open source. Get the latest version from GitHub.",
    platforms: [
      { name: "Windows", note: ".exe and .msi installers" },
      { name: "macOS", note: ".dmg" },
      { name: "Linux", note: ".AppImage, .deb and .rpm" },
      { name: "Android", note: ".apk for every architecture" },
    ],
    getIt: "Latest release",
    footer: "Built with Tauri and Typst.",
    toggles: { language: "فارسی", theme: "Toggle theme" },
  },
}
