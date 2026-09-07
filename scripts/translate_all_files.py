import re
import os
import glob

replacements_map = [
    # General / Buttons / Badges / Labels
    ("গ্রাহক লগইন", "Client Login"),
    ("এডমিন লগইন", "Admin Login"),
    ("অ্যাডমিন লগইন", "Admin Login"),
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
    ("প্যাকেজ ডাটা সফলভাবে রিসেট করে ২৬টি প্যাকেজ লোড করা হয়েছে!", "Package data reset successfully with default packages loaded!"),
    ("প্যাকেজ নবায়ন সম্পন্ন!", "Package renewal completed!"),
    ("-এর মেয়াদ", " validity extended by"),
    ("মাস বাড়ানো হয়েছে।", "month(s)."),
    ("সকল মেয়াদোত্তীর্ণ গ্রাহককে এক ক্লিকে SMS রিমাইন্ডার পাঠানো হয়েছে!", "SMS reminder sent to all expired subscribers with 1 click!"),
    ("টিকেট #", "Ticket #"),
    ("সফলভাবে খোলা হয়েছে!", "has been opened successfully!"),
    ("টিকেট স্ট্যাটাস", "Ticket status"),
    ("-এ আপডেট করা হয়েছে।", " updated."),
    ("গ্রাহক অভিযোগ সমাধান, ফিল্ড টেকনিশিয়ান অ্যাসাইন, রেড LOS ফল্ট রিকভারি ও লাইভ স্ট্যাটাস ট্র্যাকার।", "Subscriber complaint resolution, field technician assignment, Red LOS fault recovery, and live status tracker."),
    ("গ্রাহকদের প্যাকেজের মেয়াদ উত্তীর্ণের রিয়েল-টাইম ট্র্যাকিং, SMS রিমাইন্ডার ও তাৎক্ষণিক অটো-রিনিউয়াল হাব।", "Real-time subscriber expiry tracking, SMS reminders, and instant auto-renewal hub."),
    
    # App.tsx
    ("নতুন MikroTik Router \"${newRouter.name}\" সফলভাবে যুক্ত হয়েছে!", "New MikroTik Router \"${newRouter.name}\" added successfully!"),
    ("MikroTik Router \"${updated.name}\" কনফিগারেশন আপডেট হয়েছে!", "MikroTik Router \"${updated.name}\" configuration updated!"),
    ("MikroTik Router \"${target?.name || id}\" মুছে ফেলা হয়েছে!", "MikroTik Router \"${target?.name || id}\" removed!"),
    ("Router \"${targetRouter.name}\" সংযোগ বিচ্ছিন্ন করা হয়েছে", "Router \"${targetRouter.name}\" disconnected"),
    ("MikroTik (${targetRouter.ip}:${targetRouter.apiPort || 8728}) এর সাথে অথেনটিকেশন যাচাই করা হচ্ছে...", "Verifying authentication with MikroTik (${targetRouter.ip}:${targetRouter.apiPort || 8728})..."),
    ("Demo MikroTik Simulator সক্রিয় হয়েছে (Testing/Preview Mode)", "Demo MikroTik Simulator active (Testing/Preview Mode)"),
    ("MikroTik Router \"${targetRouter.name}\" (${targetRouter.ip}) আসল হার্ডওয়্যারে সফলভাবে অথেনটিকেটেড ও কানেক্ট হয়েছে!", "MikroTik Router \"${targetRouter.name}\" (${targetRouter.ip}) successfully authenticated & connected!"),
    ("কানেকশন ব্যর্থ: ${data.error || 'মাইক্রোটিক রাউটার আইপিতে কানেক্ট করা যায়নি। (ভুয়া কানেকশন দেখানো হয়নি)'}", "Connection failed: ${data.error || 'Could not connect to MikroTik router IP.'}"),
    ("কানেকশন এরর: ${err.message || 'নেটওয়ার্ক সকেট কানেক্ট করা যায়নি'}", "Connection error: ${err.message || 'Could not establish network socket'}"),
    ("⚠️ কোন রাউটার কনফিগারেশন পাওয়া যায়নি। ক্লায়েন্ট শুধুমাত্র লোকাল ডাটাবেজে সংরক্ষিত হয়েছে।", "⚠️ No active router configuration found. Client saved to local database."),
    ("⚡ ক্লায়েন্ট ${client.name} (${client.userId}) সফলভাবে মাইক্রোটিক রাউটারে (${router.name}) সিঙ্ক ও একটিভ হয়েছে!", "⚡ Subscriber ${client.name} (${client.userId}) successfully synced & activated on MikroTik (${router.name})!"),
    ("⚠️ মাইক্রোটিক রাউটার সিঙ্ক করতে ব্যর্থ: ${data.error || 'সংযোগ টাইমআউট বা ভুল পাসওয়ার্ড'}", "⚠️ MikroTik router sync failed: ${data.error || 'Connection timeout or invalid credentials'}"),
    ("❌ রাউটার সংযোগ সমস্যা: ${err.message || 'কানেকশন টাইমআউট'}", "❌ Router connection error: ${err.message || 'Connection timeout'}"),
    ("⚡ মাইক্রোটিক পোর্টে Hotspot ইউজার ${userId} সফলভাবে ${enabled ? 'সক্রিয় (ENABLED)' : 'নিষ্ক্রিয় (DISABLED)'} করা হয়েছে!", "⚡ MikroTik Hotspot user ${userId} successfully ${enabled ? 'ENABLED' : 'DISABLED'}!"),
    ("⚠️ রাউটারে ইউজার স্ট্যাটাস পরিবর্তন ব্যর্থ: ${data.error || 'সংযোগ সংযোগ বিচ্ছিন্ন'}", "⚠️ Router user status update failed: ${data.error || 'Connection disconnected'}"),
    ("🔄 রিয়েল-টাইম বিলিং সিঙ্ক: নতুন পেমেন্ট ইনভয়েসের সাথে যুক্ত করা হয়েছে!", "🔄 Real-time billing sync: New payment recorded and linked to invoice!"),
    ("📊 ${newInvoices.length} জন গ্রাহকের জন্য চলতি মাসের বিল রিয়েল-টাইমে তৈরি করা হয়েছে!", "📊 Monthly bills generated in real-time for ${newInvoices.length} subscribers!"),
    ("⚠️ ${expiredOnline.length} জন গ্রাহকের প্যাকেজের মেয়াদ শেষ হওয়ায় লাইন স্বয়ংক্রিয়ভাবে অফলাইন করা হয়েছে!", "⚠️ ${expiredOnline.length} subscribers lines set offline automatically due to expired packages!"),
    ("⚠️ মেয়াদোত্তীর্ণ সতর্কতা: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ ${c.expiry} তারিখে শেষ হয়েছে (সংযোগ অটো-অফলাইন)!", "⚠️ Expiry Alert: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, expired on ${c.expiry} (Line Auto-Offline)!"),
    ("🚨 আজই মেয়াদ শেষ: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, অবিলম্বে SMS রিমাইন্ডার পাঠান!", "🚨 Expires Today: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, send SMS reminder immediately!"),
    ("⚠️ ১ দিন বাকি: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ কাল শেষ হচ্ছে (${c.expiry})!", "⚠️ 1 Day Left: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, expiring tomorrow (${c.expiry})!"),
    ("⏰ ${info.daysLeft} দিন বাকি: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ ${c.expiry} তারিখে শেষ হবে।", "⏰ ${info.daysLeft} Days Left: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || '500'}, expires on ${c.expiry}."),
    ("⚡ প্যাকেজ \"${pkg.name}\" তৈরি হয়েছে এবং মাইক্রোটিক হটস্পট লগইন পেজে অটো সিঙ্ক হয়েছে!", "⚡ Package \"${pkg.name}\" created and synced to MikroTik Hotspot portal!"),
    ("⚡ প্যাকেজ \"${pkg.name}\" আপডেট করা হয়েছে এবং হটস্পট পেজে সিঙ্ক হয়েছে!", "⚡ Package \"${pkg.name}\" updated and synced to Hotspot portal!"),
    ("প্যাকেজ \"${target.name}\" মুছে ফেলা হয়েছে এবং হটস্পট পেজ সিঙ্ক করা হয়েছে।", "Package \"${target.name}\" removed and synced."),
    ("নতুন হটস্পট রিকুয়েস্ট: ${req.clientName} (${req.phone}) - ${req.package} [৳${req.price}]", "New Hotspot Request: ${req.clientName} (${req.phone}) - ${req.package} [৳${req.price}]"),
    ("🔔 নতুন হটস্পট রিকুয়েস্ট এসেছে! ${req.clientName} (${req.phone})", "🔔 New Hotspot Request received! ${req.clientName} (${req.phone})"),
    ("গ্রাহক \"${c.name}\" এর জন্য ইনভয়েস ও বিলিং পেজ ওপেন করা হয়েছে", "Invoice & billing opened for subscriber \"${c.name}\""),
]

def run():
    files = glob.glob("src/**/*.*", recursive=True)
    count_changes = 0
    for f in sorted(files):
        with open(f, "r", encoding="utf-8") as file:
            content = file.read()
        orig = content
        for k, v in replacements_map:
            content = content.replace(k, v)
        if content != orig:
            with open(f, "w", encoding="utf-8") as file:
                file.write(content)
            count_changes += 1
            print(f"Updated {f}")

    print(f"Total files updated: {count_changes}")

run()
