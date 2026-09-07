import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

replacements = [
    ("আল্ট্রা হাই-স্পিড অপটিক্যাল ফাইবার ইন্টারনেট", "Ultra High-Speed Optical Fiber Internet"),
    ("ফাইবার এআই সাপোর্ট", "FiberAI Support"),
    ("ফাইবার এক্সপ্রেস ইন্টারনেট", "Fiber Express ISP"),
    ("বাংলা, English, Banglish e.g. \"amar line e problem ki\", Hindi, Arabic, etc.", "English, Bengali, Hindi, Arabic, etc."),
    ("বিল পরিশোধের ৩টি সহজ নিয়ম", "3 Easy Ways to Pay Bill"),
    ("সবচেয়ে দ্রুত", "Fastest"),
    ("App-এর \"Renew & Pay\" বাটনে ক্লিক করে প্যাকেজ সিলেক্ট করে bKash বা Nagad গেটওয়ে দিয়ে পেমেন্ট করলে তাৎক্ষণিক ১ সেকেন্ডে লাইন একটিভ হয়ে যায়।",
     "Click \"Renew & Pay\" in the portal, select your package, and pay via bKash or Nagad gateway for instant activation."),
    ("বিকাশ/নগদ অ্যাপে যান ➡️ Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ ইউজার আইডি লিখে বিল পে করুন।",
     "Open bKash/Nagad App ➡️ Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ Enter User ID to pay."),
    ("ক্যাশ পেমেন্ট: আমাদের জোন অফিসে বা কালেকশন এজেন্টের কাছে।", "Cash Payment: Pay directly at our zone office or to our collection agent."),
    ("প্যাকেজসমূহ", "Packages"),
    ("নতুন সংযোগ নিতে বা প্যাকেজ আপগ্রেড করতে হেল্পলাইনে", "For new connection or package upgrade, call helpline:"),
    ("যোগাযোগ করুন।", "."),
    ("ফাইবার এক্সপ্রেস বিল পরিশোধের সহজ উপায়:", "Easy Ways to Pay Fiber Express Bill:"),
    ("অ্যাপস থেকে অটোমেটিক পেমেন্ট:", "Automatic Payment via App:"),
    ("নিচের **\"Renew & Pay\"** বাটনে ট্যাপ করে বিকাশ বা নগদ গেটওয়ে দিয়ে সরাসরি পে করুন।",
     "Tap **\"Renew & Pay\"** below to pay instantly via bKash or Nagad gateway."),
    ("বিকাশ/নগদ Pay Bill:", "bKash/Nagad Pay Bill:"),
    ("Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ User ID লিখুন।",
     "Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ Enter User ID."),
    ("বিল দেওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে লাইন চালু হয়ে যাবে।", "Connection reactivates automatically once payment is completed."),
    ("ওয়াইফাই ও রাউটার সেটআপ পরামর্শ:", "Wi-Fi & Router Setup Guidelines:"),
    ("পাসওয়ার্ড পরিবর্তন:", "Change Password:"),
    ("আপনার ব্রাউজারে `192.168.0.1` বা `192.168.1.1` লিখে রাউটার অ্যাডমিন প্যানেলে লগইন করে Wireless Security থেকে পাসওয়ার্ড পরিবর্তন করতে পারেন।",
     "Log into your router admin panel at `192.168.0.1` or `192.168.1.1` in your browser and update password under Wireless Security."),
    ("স্পিড বৃদ্ধি:", "Speed Boost:"),
    ("রাউটারটি ঘরের উঁচু স্থানে রাখুন এবং ডুয়াল-ব্যান্ড হলে **5GHz** নেটওয়ার্কে যুক্ত থাকুন।",
     "Place the router in an elevated open location and connect to the **5GHz** band if supported."),
    ("রিবুট:", "Reboot:"),
    ("যেকোনো সংযোগ জটিলতায় রাউটারটি ৫ সেকেন্ড বন্ধ রেখে চালু করুন।",
     "In case of any connectivity drop, power cycle (turn off for 5 seconds) your router."),
    ("আপনার বিলের মেয়াদ শেষ (Billing Expired):", "Your Subscription Expired (Billing Expired):"),
    ("প্রিয় **${identifiedClient.name}**, আপনার মাসিক বিল বকেয়া থাকায় লাইনটি সাময়িকভাবে বন্ধ আছে।",
     "Dear **${identifiedClient.name}**, your connection is paused due to unpaid monthly bill."),
    ("ইউজার আইডি:", "User ID:"),
    ("প্যাকেজ:", "Package:"),
    ("মেয়াদ শেষ:", "Expired on:"),
    ("বিল:", "Bill:"),
    ("নিচে **\"Renew & Pay\"** বাটনে ক্লিক করে বিকাশ/নগদে বিল পরিশোধ করুন।",
     "Click **\"Renew & Pay\"** below to pay your bill via bKash/Nagad."),
    ("লাইন ড্রপ বা সিঙ্ক সমস্যা সনাক্ত হয়েছে:", "Line Drop / Router Sync Issue Detected:"),
    ("প্রিয় **${identifiedClient.name}**, আপনার বিলের মেয়াদ সক্রিয় আছে (${identifiedClient.expiry} পর্যন্ত), তবে রাউটার সংযোগে ড্রপ হয়েছে।",
     "Dear **${identifiedClient.name}**, your subscription is active (valid until ${identifiedClient.expiry}), but router connection session dropped."),
    ("নিচে **\"⚡ ১-ক্লিকে অটো-ফিক্স ও রিসেট করুন\"** বাটনে ক্লিক করুন এবং রাউটারটি একবার রিস্টার্ট করুন।",
     "Click **\"⚡ 1-Click Auto-Fix & Reset\"** below and restart your router once."),
    ("আপনার ইন্টারনেট লাইন সম্পূর্ণ সচল ও সক্রিয়:", "Your Internet Connection is Active & Online:"),
    ("প্রিয় **${identifiedClient.name}**,", "Dear **${identifiedClient.name}**,"),
    ("দিন বাকি", "days remaining"),
    ("স্ট্যাটাস:", "Status:"),
    ("অনলাইন", "Online"),
    ("যেকোনো বিষয়ে আরও জানতে প্রশ্ন করতে পারেন!", "Feel free to ask any other questions!"),
    ("আপনার লাইনের সুনির্দিষ্ট তথ্য ও সমাধানের জন্য:", "For accurate status and troubleshooting of your line:"),
    ("অনুগ্রহ করে আপনার **ইউজারনেম (User ID)** অথবা নিবন্ধিত ১১ ডিজিটের মোবাইল নম্বরটি লিখুন। আমি এখনই আপনার লাইনের স্ট্যাটাস ও সমাধান জানিয়ে দেব।",
     "Please provide your **Username (User ID)** or 11-digit registered phone number to diagnose your connection."),
    ("আসসালামু আলাইকুম! আমি ফাইবার এক্সপ্রেস আইএসপি-এর অলরাউন্ডার এআই সহকারী।\n\n- ইন্টারনেট লাইন বা বিল সম্পর্কে জানতে যেকোনো প্রশ্ন করুন।\n- আমাদের প্যাকেজ ও স্পিড জানতে লিখুন: \"প্যাকেজগুলো কি কি?\"\n- বিশ্ব, বিজ্ঞান, প্রযুক্তি বা যেকোনো বিষয়ে যেকোনো ভাষায় প্রশ্ন করতে পারেন!",
     "Hello! I am your Fiber Express ISP AI Support Assistant.\n\n- Ask any question regarding your internet line, speed, or billing.\n- To view available packages & speeds, ask: \"What are the packages?\"\n- Feel free to ask any question about technology, science, or general topics!"),
]

for old, new in replacements:
    text = text.replace(old, new)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("server.ts cleaned successfully.")
