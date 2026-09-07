import re
import os

# Translation dictionary mapping exact or pattern matches
def translate_content(filepath, text):
    # Common replacements across all files
    general_replacements = [
        ("গ্রাহক লগইন", "Client Login"),
        ("এডমিন লগইন", "Admin Login"),
        ("অ্যাডমিন প্রবেশ", "Admin Login"),
        ("গ্রাহক সেলফ-কেয়ার", "Client Self-Care"),
        ("কোনো ক্লায়েন্ট পাওয়া যায়নি।", "No clients found."),
        ("কোনো ক্লায়েন্ট পাওয়া যায়নি", "No clients found"),
        ("কোনো তথ্য পাওয়া যায়নি", "No data found"),
        ("কোনো রেকর্ড পাওয়া যায়নি", "No records found"),
        ("কোনো সাপোর্ট টিকেট পাওয়া যায়নি।", "No support tickets found."),
        ("কোনো সাপোর্ট টিকেট পাওয়া যায়নি", "No support tickets found"),
        ("সকল নোটিফিকেশন ও রিকুয়েস্ট ডাটা মুছে ফেলা হয়েছে", "All notification and request data has been cleared"),
        ("সকল সিস্টেমেিক অডিট লগ ডাটা মুছে ফেলা হয়েছে", "All audit log data has been cleared"),
        ("সকল ইনভয়েস ও বিলিং ডাটা মুছে ফেলা হয়েছে", "All invoice and billing data has been cleared"),
        ("সকল বিলিং ও পেমেন্ট হিস্ট্রি ডাটা মুছে ফেলা হয়েছে", "All billing and payment history data has been cleared"),
        ("সকল হটস্পট ইউজার ও রিকুয়েস্ট ডাটা মুছে ফেলা হয়েছে", "All hotspot user and request data has been cleared"),
        ("সকল মেয়াদের প্রোফাইল মুছে ফেলা হয়েছে", "All validity profiles have been cleared"),
        ("সকল ব্যান্ডউইথ প্রোফাইল মুছে ফেলা হয়েছে", "All bandwidth profiles have been cleared"),
        ("সকল ক্লায়েন্ট ডাটা মুছে ফেলা হয়েছে", "All client data has been deleted"),
        ("সমস্ত পুরানো তথ্য রিসেট করা হয়েছে। আপনার অ্যাপ এখন একদম নতুন (0 Clients)!", "All data has been reset. Your app is now ready with fresh initial state!"),
        ("প্যাকেজ ডাটা সফলভাবে রিসেট করে ২৬টি প্যাকেজ লোড করা হয়েছে!", "Package data reset successfully with 26 default packages loaded!"),
    ]

    for k, v in general_replacements:
        text = text.replace(k, v)

    # Specific file replacements
    if "initialData.ts" in filepath:
        text = text.replace("name: '২৪ ঘন্টার প্যাক (১ দিন)'", "name: '24 Hours Pass (1 Day)'")
        text = text.replace("description: '২৪ ঘন্টা মেয়াদের বিশেষ ব্রডব্যান্ড বা হটস্পট কানেকশন প্যাক'", "description: '24-hour broadband or hotspot voucher pass'")
        text = text.replace("name: '৩ দিনের মিনি পাস'", "name: '3 Days Mini Pass'")
        text = text.replace("description: '৩ দিনের জন্য হটস্পট ভাউচার পাস'", "description: '3-day temporary hotspot voucher pass'")
        text = text.replace("name: '৭ দিনের সাপ্তাহিক প্যাক'", "name: '7 Days Weekly Pack'")
        text = text.replace("description: '১ সপ্তাহের জন্য লিমিটেড প্যাক'", "description: '1-week standard connection package'")
        text = text.replace("name: '১৫ দিনের হাফ-মান্থ প্যাক'", "name: '15 Days Half-Month Pack'")
        text = text.replace("description: '১৫ দিনের প্যাকেজ সাথে ১ দিন গ্রেস পিরিয়ড'", "description: '15-day subscription with 1 day grace period'")
        text = text.replace("name: '৩০ দিনের নিয়মিত মান্থলি (Default)'", "name: '30 Days Monthly (Default)'")
        text = text.replace("description: 'স্ট্যান্ডার্ড ১ মাসের ব্রডব্যান্ড / হটস্পট কানেকশন'", "description: 'Standard 1-month broadband connection'")
        text = text.replace("name: '৯০ দিনের কোয়ার্টারলি প্যাক'", "name: '90 Days Quarterly Pack'")
        text = text.replace("description: '৩ মাসের লং টার্ম ব্রডব্যান্ড প্রিপেইড প্যাক'", "description: '3-month long term prepaid package'")
        text = text.replace("name: '৩৬৫ দিনের বাৎসরিক প্যাক'", "name: '365 Days Yearly Pack'")
        text = text.replace("description: '১ বছরের ফুল ইয়ার ব্রডব্যান্ড কানেকশন'", "description: 'Full 1-year annual subscription package'")

    if "App.tsx" in filepath:
        text = text.replace("সফলভাবে মাইক্রোটিক রাউটারে", "successfully synced and activated on MikroTik Router")
        text = text.replace("সিঙ্ক ও একটিভ হয়েছে!", "!")
        text = text.replace("⚠️ মাইক্রোটিক রাউটার সিঙ্ক করতে ব্যর্থ: ${data.error || 'সংযোগ টাইমআউট বা ভুল পাসওয়ার্ড'}", "⚠️ MikroTik router sync failed: ${data.error || 'Connection timeout or invalid credentials'}")
        text = text.replace("❌ রাউটার সংযোগ সমস্যা: ${err.message || 'কানেকশন টাইমআউট'}", "❌ Router connection error: ${err.message || 'Connection timeout'}")
        text = text.replace("⚡ মাইক্রোটিক পোর্টে Hotspot ইউজার ${userId} সফলভাবে ${enabled ? 'সক্রিয় (ENABLED)' : 'নিষ্ক্রিয় (DISABLED)'} করা হয়েছে!", "⚡ MikroTik Hotspot User ${userId} successfully ${enabled ? 'ENABLED' : 'DISABLED'}!")
        text = text.replace("⚠️ রাউটারে ইউজার স্ট্যাটাস পরিবর্তন ব্যর্থ: ${data.error || 'সংযোগ সংযোগ বিচ্ছিন্ন'}", "⚠️ Router user status change failed: ${data.error || 'Connection disconnected'}")
        text = text.replace("🔄 রিয়েল-টাইম বিলিং সিঙ্ক: নতুন পেমেন্ট ইনভয়েসের সাথে যুক্ত করা হয়েছে!", "🔄 Real-time billing sync: New payment linked to invoice!")
        text = text.replace("জন গ্রাহকের জন্য চলতি মাসের বিল রিয়েল-টাইমে তৈরি করা হয়েছে!", "subscribers monthly bill generated in real-time!")
        text = text.replace("📊 ${newInvoices.length} জন গ্রাহকের জন্য চলতি মাসের বিল রিয়েল-টাইমে তৈরি করা হয়েছে!", "📊 Monthly bills generated for ${newInvoices.length} subscribers in real-time!")
        text = text.replace("⚠️ ${expiredOnline.length} জন গ্রাহকের প্যাকেজের মেয়াদ শেষ হওয়ায় লাইন স্বয়ংক্রিয়ভাবে অফলাইন করা হয়েছে!", "⚠️ ${expiredOnline.length} subscribers lines set offline automatically due to expired packages!")
        text = text.replace("⚠️ মেয়াদোত্তীর্ণ সতর্কতা: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ ${c.expiry} তারিখে শেষ হয়েছে (সংযোগ অটো-অফলাইন)!", "⚠️ Expiration Alert: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, expired on ${c.expiry} (Line Auto-Offline)!")
        text = text.replace("🚨 আজই মেয়াদ শেষ: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, অবিলম্বে SMS রিমাইন্ডার পাঠান!", "🚨 Expires Today: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, please send renewal SMS reminder!")
        text = text.replace("⚠️ ১ দিন বাকি: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ কাল শেষ হচ্ছে (${c.expiry})!", "⚠️ 1 Day Left: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, expiring tomorrow (${c.expiry})!")
        text = text.replace("⏰ ${info.daysLeft} দিন বাকি: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ ${c.expiry} তারিখে শেষ হবে।", "⏰ ${info.daysLeft} Days Left: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, expires on ${c.expiry}.")
        text = text.replace("⚡ প্যাকেজ \"${pkg.name}\" তৈরি হয়েছে এবং মাইক্রোটিক হটস্পট লগইন পেজে অটো সিঙ্ক হয়েছে!", "⚡ Package \"${pkg.name}\" created and synced to MikroTik Hotspot login page!")
        text = text.replace("⚡ প্যাকেজ \"${pkg.name}\" আপডেট করা হয়েছে এবং হটস্পট পেজে সিঙ্ক হয়েছে!", "⚡ Package \"${pkg.name}\" updated and synced to Hotspot portal!")
        text = text.replace("প্যাকেজ \"${target.name}\" মুছে ফেলা হয়েছে এবং হটস্পট পেজ সিঙ্ক করা হয়েছে।", "Package \"${target.name}\" removed and synced.")
        text = text.replace("নতুন হটস্পট রিকুয়েস্ট:", "New Hotspot Request:")
        text = text.replace("🔔 নতুন হটস্পট রিকুয়েস্ট এসেছে!", "🔔 New Hotspot Request received!")
        text = text.replace("গ্রাহক \"${c.name}\" এর জন্য ইনভয়েস ও বিলিং পেজ ওপেন করা হয়েছে", "Invoice & billing opened for subscriber \"${c.name}\"")

    return text

print("Script template created.")
