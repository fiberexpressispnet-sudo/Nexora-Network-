with open("feisp_database.json", "r", encoding="utf-8") as f:
    text = f.read()

replacements = [
    ("২৪ ঘন্টার প্যাক (১ দিন)", "24-Hour Pack (1 Day)"),
    ("২৪ ঘন্টা মেয়াদের বিশেষ ব্রডব্যান্ড বা হটস্পট কানেকশন প্যাক", "24-hour validity broadband or hotspot connection pack"),
    ("৩ দিনের মিনি পাস", "3 Days Mini Pass"),
    ("৩ দিনের জন্য হটস্পট ভাউচার পাস", "3-day hotspot voucher pass"),
    ("🔔 [অনুমোদন অপেক্ষমাণ] গ্রাহক Niloy (user1) - ৳300 (bKash), TrxID: TXN-DQSW0RRR1 পেমেন্ট করেছেন। এডমিন প্যানেলের \"Subscriptions\" থেকে \"একসেপ্ট\" (Accept) করুন।",
     "🔔 [Pending Approval] Subscriber Niloy (user1) paid ৳300 (bKash), TrxID: TXN-DQSW0RRR1. Please accept via Subscriptions in Admin panel."),
    ("⏰ 2 দিন বাকি: Mohammad Niloy (user1) - প্যাকেজ 10 Mbps 1D  20 Tk, বিল ৳20, মেয়াদ 2026-08-22 তারিখে শেষ হবে।",
     "⏰ 2 days remaining: Mohammad Niloy (user1) - Package 10 Mbps 1D 20 Tk, Bill ৳20, Expires on 2026-08-22."),
]

for old, new in replacements:
    text = text.replace(old, new)

with open("feisp_database.json", "w", encoding="utf-8") as f:
    f.write(text)

with open("server.ts", "r", encoding="utf-8") as f:
    stext = f.read()

stext = stext.replace("আমাদের ফাইবার এক্সপ্রেস আইএসপি (Fiber Express ISP)-এর নিরাপত্তা ও গ্রাহকের গোপনীয়তা সুরক্ষা বিধিমালার কারণে কোনো অননুমোদিত গ্রাহকের অ্যাকাউন্ট, সক্রিয় (Active) বা রিনিউ করা আইডি ও পাসওয়ার্ড প্রদান করা সম্পূর্ণ নিষিদ্ধ ও প্রযুক্তিগতভাবে অসম্ভব।\n\nআপনি নতুন ইন্টারনেট সংযোগ নিতে চাইলে অনুগ্রহ করে সরাসরি আমাদের অফিসে বা হেল্পলাইনে (${settings.phone || '01410381233'}) .",
                      "Under Fiber Express ISP security and privacy guidelines, sharing unauthorized credentials or active accounts is strictly forbidden. For a new connection, please contact our helpline (${settings.phone || '01410381233'}).")

stext = stext.replace("🚫 **নিরাপত্তা ও পলিসি সতর্কতা:**", "🚫 **Security & Policy Warning:**")
stext = stext.replace("🚫 **অনুমতি নেই:**\n\nআমি শুধুমাত্র ফাইবার এক্সপ্রেস গ্রাহক সেবা ও অলরাউন্ডার এআই অ্যাসিস্ট্যান্ট। অ্যাপসের ডিজাইন, সিস্টেম কোড, মূল্যতালিকা, রাউটার অ্যাডমিন ক্রেডেনশিয়াল বা কোর কনফিগারেশন পরিবর্তন করার কোনো এক্সেস বা অনুমতি আমার নেই।",
                      "🚫 **Permission Denied:**\n\nI am the Fiber Express AI Support Assistant. I do not have permission or access to alter system designs, codebase, pricing plans, router credentials, or core configuration.")

stext = stext.replace("✅ **আপনার অ্যাকাউন্টের তথ্য সফলভাবে যাচাই করা হয়েছে:**\n\n- **Client Name:** ${identifiedClient.name}\n- **ইউজার আইডি (User ID):** `",
                      "✅ **Account Verified Successfully:**\n\n- **Client Name:** ${identifiedClient.name}\n- **User ID:** `")

stext = stext.replace("- **পাসওয়ার্ড (Password):** `", "- **Password:** `")
stext = stext.replace("আপনার লগইন প্যানেলে গিয়ে উক্ত ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করতে পারেন।", "You can log into your account portal using these credentials.")
stext = stext.replace("❌ **কোনো তথ্য পাওয়া যায়নি:**\n\nআপনার প্রদত্ত মোবাইল নম্বর (`${phoneMatch[0]}`) দিয়ে ফাইবার এক্সপ্রেস সিস্টেমে কোনো গ্রাহক অ্যাকাউন্ট পাওয়া যায়নি।\n\nঅনুগ্রহ করে নিশ্চিত হয়ে সঠিক নিবন্ধিত ১১ ডিজিটের মোবাইল নম্বরটি প্রদান করুন অথবা আমাদের কাস্টমার কেয়ারে (${settings.phone || '01410381233'}) .",
                      "❌ **Account Not Found:**\n\nNo account found associated with mobile number (`${phoneMatch[0]}`). Please check and enter your registered 11-digit phone number or contact customer care (${settings.phone || '01410381233'}).")

stext = stext.replace("1. **Change Password:** আপনার ব্রাউজারে `192.168.0.1` বা `192.168.1.1` লিখে রাউটার অ্যাডমিন প্যানেলে লগইন করে Wireless Security থেকে পাসওয়ার্ড পরিবর্তন করতে পারেন।",
                      "1. **Change Password:** Access your router dashboard at `192.168.0.1` or `192.168.1.1` in your browser and update password under Wireless Security.")

stext = stext.replace("fallbackReply = `আসসালামু আলাইকুম! আমি ফাইবার এক্সপ্রেস আইএসপি-এর অলরাউন্ডার এআই সহকারী।\n\n- ইন্টারনেট লাইন বা বিল সম্পর্কে জানতে যেকোনো প্রশ্ন করুন।\n- আমাদের প্যাকেজ ও স্পিড জানতে লিখুন: \"প্যাকেজগুলো কি কি?\"\n- বিশ্ব, বিজ্ঞান, প্রযুক্তি বা যেকোনো বিষয়ে যেকোনো ভাষায় প্রশ্ন করতে পারেন!`;",
                      "fallbackReply = `Hello! I am your Fiber Express ISP AI Assistant.\n\n- Ask any question regarding your connection, speeds, or billing.\n- Ask \"What are the packages?\" to see available plans.\n- Feel free to ask about tech, science, or general topics!`;")

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(stext)

print("Cleaned up final traces.")
