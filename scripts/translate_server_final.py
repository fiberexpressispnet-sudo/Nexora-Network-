with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

server_replacements = [
    ('error: "গ্রাহকের তথ্য সিস্টেমে পাওয়া যায়নি।"', 'error: "Subscriber info not found in system."'),
    ("আপনার বিলের মেয়াদ ${targetClient.expiry || 'পূর্বে'} শেষ হয়ে গেছে (${Math.abs(daysLeft)} দিন বকেয়া)। বিল বকেয়া থাকায় লাইন সাময়িকভাবে বন্ধ আছে। অনুগ্রহ করে 'Renew & Pay' মেনু থেকে ৳${targetClient.price || '500'} টাকা পরিশোধ করুন।",
     "Your subscription expired on ${targetClient.expiry || 'past due date'} (${Math.abs(daysLeft)} days overdue). Line is temporarily paused. Please pay ৳${targetClient.price || '500'} via 'Renew & Pay'."),
    ("আপনার বিল পরিশোধিত রয়েছে এবং মেয়াদ সচল আছে (${targetClient.expiry} পর্যন্ত)। তবে MikroTik রাউটার নোডে লাইনটি সিঙ্ক ড্রপ বা ডিসকানেক্ট দেখাচ্ছে। নিচে 'অটো-ফিক্স ও রিবুট' চাপলে এটি ঠিক হয়ে যাবে।",
     "Your bill is paid and subscription is active (valid until ${targetClient.expiry}). MikroTik session dropped. Click 'Auto-Fix & Reset' below to reactivate."),
    ("আপনার ইন্টারনেট লাইনটি সম্পূর্ণ সচল ও একটিভ আছে। Package: ${targetClient.package} (${targetClient.downloadSpeed || '10'} Mbps)। Validity: ${targetClient.expiry} পর্যন্ত।",
     "Your internet line is completely active and online. Package: ${targetClient.package} (${targetClient.downloadSpeed || '10'} Mbps). Validity: until ${targetClient.expiry}."),
    ('error: "সিস্টেমে কোনো গ্রাহকের তথ্য পাওয়া যায়নি। অনুগ্রহ করে ইউজার আইডি দিন।"', 'error: "No subscriber found in system. Please provide User ID."'),
    ("গ্রাহক ${targetClient.name} (${targetClient.userId})-এর লাইন মাইক্রোটিক রাউটারে সফলভাবে রিসেট ও রি-সিঙ্ক করা হয়েছে! লাইন এখন সচল।",
     "Client ${targetClient.name} (${targetClient.userId}) line reset and resynced on MikroTik successfully! Connection is now online."),
    ("lowerPrompt.includes('একটিভ আইডি') ||", "lowerPrompt.includes('active id') ||"),
    ("lowerPrompt.includes('রিনিউ করা আইডি') ||", "lowerPrompt.includes('renewed id') ||"),
    ("lowerPrompt.includes('অন্য কারো') ||", "lowerPrompt.includes('someone else') ||"),
    ("lowerPrompt.includes('ফ্রি আইডি') ||", "lowerPrompt.includes('free id') ||"),
    ("lowerPrompt.includes('কারো পাসওয়ার্ড') ||", "lowerPrompt.includes('other password') ||"),
    ("lowerPrompt.includes('অন্য ইউজার') ||", "lowerPrompt.includes('other user') ||"),
    ("lowerPrompt.includes('ফ্রি ইন্টারনেট') ||", "lowerPrompt.includes('free internet') ||"),
    ("🚫 **নিরাপত্তা ও পলিসি সতর্কতা:**\n\nআমাদের ফাইবার এক্সপ্রেস আইএসপি (Fiber Express ISP)-এর নিরাপত্তা ও গ্রাহকের গোপনীয়তা সুরক্ষা বিধিমালার কারণে কোনো অননুমোদিত গ্রাহকের অ্যাকাউন্ট, সক্রিয় (Active) বা রিনিউ করা আইডি ও পাসওয়ার্ড প্রদান করা সম্পূর্ণ নিষিদ্ধ ও প্রযুক্তিগতভাবে অসম্ভব।\n\nআপনি নতুন ইন্টারনেট সংযোগ নিতে চাইলে অনুগ্রহ করে সরাসরি আমাদের অফিসে বা হেল্পলাইনে (${settings.phone || '01410381233'}) .",
     "🚫 **Security & Privacy Policy:**\n\nUnder Fiber Express ISP security guidelines, providing unauthorized account credentials or active IDs is strictly forbidden. For a new connection, please contact our helpline (${settings.phone || '01410381233'})."),
    ("🚫 **অনুমতি নেই:**\n\nআমি শুধুমাত্র ফাইবার এক্সপ্রেস গ্রাহক সেবা ও অলরাউন্ডার এআই অ্যাসিস্ট্যান্ট। অ্যাপসের ডিজাইন, সিস্টেম কোড, মূল্যতালিকা, রাউটার অ্যাডমিন ক্রেডেনশিয়াল বা কোর কনফিগারেশন পরিবর্তন করার কোনো এক্সেস বা অনুমতি আমার নেই।",
     "🚫 **Permission Denied:**\n\nI am the Fiber Express AI Support Assistant. I do not have authorization or access to modify system design, code, pricing, admin passwords, or router configurations."),
    ("✅ **আপনার অ্যাকাউন্টের তথ্য সফলভাবে যাচাই করা হয়েছে:**\n\n- **Client Name:** ${identifiedClient.name}\n- **ইউজার আইডি (User ID):** \`${identifiedClient.userId}\`\n- **পাসওয়ার্ড (Password):** \`${identifiedClient.password || '123456'}\`\n- **Package:** ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)\n- **Billing Expiry:** ${identifiedClient.expiry}\n- **Status:** ${identifiedClient.status === 'online' ? '🟢 Active (Online)' : '🔴 Inactive / Expired (Offline)'}\n\nআপনার লগইন প্যানেলে গিয়ে উক্ত ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করতে পারেন।",
     "✅ **Account Verified Successfully:**\n\n- **Client Name:** ${identifiedClient.name}\n- **User ID:** \`${identifiedClient.userId}\`\n- **Password:** \`${identifiedClient.password || '123456'}\`\n- **Package:** ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)\n- **Billing Expiry:** ${identifiedClient.expiry}\n- **Status:** ${identifiedClient.status === 'online' ? '🟢 Active (Online)' : '🔴 Inactive / Expired (Offline)'}\n\nYou can log in with these credentials."),
    ("❌ **কোনো তথ্য পাওয়া যায়নি:**\n\nআপনার প্রদত্ত মোবাইল নম্বর (\`${phoneMatch[0]}\`) দিয়ে ফাইবার এক্সপ্রেস সিস্টেমে কোনো গ্রাহক অ্যাকাউন্ট পাওয়া যায়নি।\n\nঅনুগ্রহ করে নিশ্চিত হয়ে সঠিক নিবন্ধিত ১১ ডিজিটের মোবাইল নম্বরটি প্রদান করুন অথবা আমাদের কাস্টমার কেয়ারে (${settings.phone || '01410381233'}) .",
     "❌ **Account Not Found:**\n\nNo client account found matching phone number (\`${phoneMatch[0]}\`). Please verify your registered 11-digit mobile number or contact support (${settings.phone || '01410381233'})."),
    ("lowerPrompt.includes('নগদ')", "lowerPrompt.includes('nagad')"),
    ("আপনার ব্রাউজারে `192.168.0.1` বা `192.168.1.1` লিখে রাউটার অ্যাডমিন প্যানেলে লগইন করে Wireless Security থেকে পাসওয়ার্ড পরিবর্তন করতে পারেন।",
     "Log into your router admin panel at `192.168.0.1` or `192.168.1.1` in your browser and change password under Wireless Security."),
    ("আসসালামু আলাইকুম! আমি ফাইবার এক্সপ্রেস আইএসপি-এর অলরাউন্ডার এআই সহকারী।\n\n- ইন্টারনেট লাইন বা বিল সম্পর্কে জানতে যেকোনো প্রশ্ন করুন।\n- আমাদের প্যাকেজ ও স্পিড জানতে লিখুন: \"প্যাকেজগুলো কি কি?\"\n- বিশ্ব, বিজ্ঞান, প্রযুক্তি বা যেকোনো বিষয়ে যেকোনো ভাষায় প্রশ্ন করতে পারেন!",
     "Hello! I am the Fiber Express ISP AI Assistant.\n\n- Feel free to ask any question regarding your connection or bills.\n- Ask \"What are the packages?\" to see available speeds and plans.\n- Ask any question about tech, science, or general topics!"),
]

for old, new in server_replacements:
    text = text.replace(old, new)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("server.ts translations completed.")
