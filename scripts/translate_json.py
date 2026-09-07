with open("initialData.json", "r", encoding="utf-8") as f:
    text = f.read()

replacements = [
    ("১ দিনের ইমার্জেন্সি পাস", "1 Day Emergency Pass"),
    ("২৪ ঘণ্টার ট্রায়াল বা ইমার্জেন্সি হটস্পট প্যাক", "24-hour trial or emergency hotspot pack"),
    ("৭ দিনের সাপ্তাহিক প্যাক", "7 Days Weekly Pack"),
    ("১ সপ্তাহের জন্য লিমিটেড প্যাক", "Limited 1-week pack"),
    ("১৫ দিনের হাফ-মান্থ প্যাক", "15 Days Half-Month Pack"),
    ("১৫ দিনের প্যাকেজ সাথে ১ দিন গ্রেস পিরিয়ড", "15-day package with 1-day grace period"),
    ("৩০ দিনের নিয়মিত মান্থলি (Default)", "30 Days Regular Monthly (Default)"),
    ("স্ট্যান্ডার্ড ১ মাসের ব্রডব্যান্ড / হটস্পট কানেকশন", "Standard 1-month broadband / hotspot connection"),
    ("৯০ দিনের কোয়ার্টারলি প্যাক", "90 Days Quarterly Pack"),
    ("৩ মাসের লং টার্ম ব্রডব্যান্ড প্রিপেইড প্যাক", "3 months long-term prepaid broadband pack"),
    ("৩৬৫ দিনের বাৎসরিক প্যাক", "365 Days Annual Pack"),
    ("১ বছরের ফুল ইয়ার ব্রডব্যান্ড কানেকশন", "Full 1-year broadband connection"),
]

for old, new in replacements:
    text = text.replace(old, new)

with open("initialData.json", "w", encoding="utf-8") as f:
    f.write(text)

print("initialData.json translated.")
