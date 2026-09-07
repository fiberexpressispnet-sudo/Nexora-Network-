with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

translations = [
    ("আমাদের নেটওয়ার্ক নীতি ও গোপনীয়তা নির্দেশিকা অনুযায়ী কোনো ফ্রিতে আইডি দেওয়া বা অন্য কারও অ্যাকাউন্ট এক্সেস দেওয়ার অনুমতি নেই।",
     "According to our network policy and privacy guidelines, issuing unauthorized free accounts or sharing credentials of other subscribers is strictly prohibited."),
    ("আমাদের সিকিউরিটি পলিসি অনুযায়ী অন্য কারও আইডি বা পাসওয়ার্ড দেওয়া সম্পূর্ণ নিষিদ্ধ।",
     "Under our security policy, providing another subscriber's credentials is strictly prohibited."),
    ("আমাদের পলিসি অনুযায়ী পাসওয়ার্ড পরিবর্তন বা হ্যাক করার কোনো সহায়তা প্রদান করা সম্ভব নয়।",
     "Under our policy, unauthorized password changes or hacking assistance cannot be provided."),
    ("কোম্পানি (Fiber Express ISP)-এর নিরাপত্তা ও গ্রাহকের গোপনীয়তা সুরক্ষা বিধিমালার কারণে কোনো অননুমোদিত গ্রাহকের অ্যাকাউন্ট, সক্রিয় (Active) বা রিনিউ করা আইডি ও পাসওয়ার্ড প্রদান করা সম্পূর্ণ নিষিদ্ধ ও প্রযুক্তিগতভাবে অসম্ভব।\n\nআপনি নতুন ইন্টারনেট সংযোগ নিতে চাইলে অনুগ্রহ করে সরাসরি আমাদের অফিসে বা হেল্পলাইনে (${settings.phone || '01410381233'}) .",
     "Due to security and customer privacy regulations, sharing unauthorized credentials or active IDs is strictly forbidden. For a new connection, please contact our helpline (${settings.phone || '01410381233'})."),
    ("🚫 **অনুমতি নেই:**\n\nআমি শুধুমাত্র ফাইবার এক্সপ্রেস গ্রাহক সেবা ও অলরাউন্ডার এআই অ্যাসিস্ট্যান্ট। অ্যাপসের ডিজাইন, সিস্টেম কোড, মূল্যতালিকা, রাউটার অ্যাডমিন ক্রেডেনশিয়াল বা কোর কনফিগারেশন পরিবর্তন করার কোনো এক্সেস বা অনুমতি আমার নেই।",
     "🚫 **Access Denied:**\n\nI am the Fiber Express AI Support Assistant. I do not have permission or access to modify system design, code, pricing, admin credentials, or core network configurations."),
    ("✅ **আপনার অ্যাকাউন্টের তথ্য সফলভাবে যাচাই করা হয়েছে:**\n\n- **গ্রাহকের নাম:** ${identifiedClient.name}\n- **ইউজার আইডি (User ID):** \`${identifiedClient.userId}\`\n- **পাসওয়ার্ড (Password):** \`${identifiedClient.password || '123456'}\`\n- **Package:** ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)\n- **বিলের মেয়াদ:** ${identifiedClient.expiry}\n- **Status:** ${identifiedClient.status === 'online' ? '🟢 সচল (Online)' : '🔴 বন্ধ/বকেয়া (Offline)'}\n\nআপনার লগইন প্যানেলে গিয়ে উক্ত ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করতে পারেন।",
     "✅ **Account Verified Successfully:**\n\n- **Client Name:** ${identifiedClient.name}\n- **User ID:** \`${identifiedClient.userId}\`\n- **Password:** \`${identifiedClient.password || '123456'}\`\n- **Package:** ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)\n- **Billing Expiry:** ${identifiedClient.expiry}\n- **Status:** ${identifiedClient.status === 'online' ? '🟢 Active (Online)' : '🔴 Unpaid / Offline'}\n\nYou can log in using these credentials."),
    ("❌ **কোনো তথ্য পাওয়া যায়নি:**\n\nআপনার প্রদত্ত মোবাইল নম্বর (\`${phoneMatch[0]}\`) দিয়ে ফাইবার এক্সপ্রেস সিস্টেমে কোনো গ্রাহক অ্যাকাউন্ট পাওয়া যায়নি।\n\nঅনুগ্রহ করে নিশ্চিত হয়ে সঠিক নিবন্ধিত ১১ ডিজিটের মোবাইল নম্বরটি প্রদান করুন অথবা আমাদের কাস্টমার কেয়ারে (${settings.phone || '01410381233'}) .",
     "❌ **Account Not Found:**\n\nNo account was found for the phone number (\`${phoneMatch[0]}\`). Please verify your registered 11-digit mobile number or contact customer support (${settings.phone || '01410381233'})."),
    ("গ্রাহক এখনো লগইন বা ইউজার আইডি প্রদান করেননি।", "Client has not logged in or provided a User ID."),
    ("গ্রাহকের নাম:", "Client Name:"),
    ("বিলের পরিমাণ:", "Bill Amount:"),
    ("বিলের মেয়াদ:", "Billing Expiry:"),
    ("মেয়াদ Status:", "Validity Status:"),
    ("বকেয়া/মেয়াদ শেষ (${Math.abs(clientDaysLeft)} দিন পূর্বে শেষ হয়েছে)", "Expired (${Math.abs(clientDaysLeft)} days ago)"),
    ("সক্রিয়/চলতি (${clientDaysLeft} days remaining আছে)", "Active (${clientDaysLeft} days remaining)"),
    ("মাইক্রোটিক Status:", "MikroTik Status:"),
    ("🟢 সচল (Online)", "🟢 Active (Online)"),
    ("🔴 বন্ধ/ড্রপ (Offline)", "🔴 Inactive / Dropped (Offline)"),
    ("🔴 বন্ধ/বকেয়া (Offline)", "🔴 Inactive / Expired (Offline)"),
    ("গতি", "Speed:"),
    ("আপলোড:", "Upload:"),
    ("মূল্য:", "Price:"),
    ("মাস", "month"),
    ("রিনিউ:", "Renewal:"),
    ("মেয়াদ:", "Validity:"),
    ("30 দিন", "30 days"),
    ("বিবরণ:", "Description:"),
    ("আপনার ব্রাউজারে `192.168.0.1` বা `192.168.1.1` লিখে রাউটার অ্যাডমিন প্যানেলে লগইন করে Wireless Security থেকে পাসওয়ার্ড পরিবর্তন করতে পারেন।",
     "Log in to your router admin panel at `192.168.0.1` or `192.168.1.1` in your browser to change the Wi-Fi password under Wireless Security."),
    ("আসসালামু আলাইকুম! আমি ফাইবার এক্সপ্রেস আইএসপি-এর অলরাউন্ডার এআই সহকারী।\n\n- ইন্টারনেট লাইন বা বিল সম্পর্কে জানতে যেকোনো প্রশ্ন করুন।\n- আমাদের প্যাকেজ ও স্পিড জানতে লিখুন: \"প্যাকেজগুলো কি কি?\"\n- বিশ্ব, বিজ্ঞান, প্রযুক্তি বা যেকোনো বিষয়ে যেকোনো ভাষায় প্রশ্ন করতে পারেন!",
     "Hello! I am your Fiber Express ISP AI Assistant.\n\n- Ask any question regarding your internet connection or billing.\n- Ask \"What are the packages?\" to see available speeds and plans.\n- Feel free to ask about tech, science, or any general topics!"),
]

for old, new in translations:
    text = text.replace(old, new)

# Also translate any keyword array prompts if present
text = text.replace("lowerPrompt.includes('ডিজাইন চেঞ্জ') ||", "lowerPrompt.includes('change design') ||")
text = text.replace("lowerPrompt.includes('কনফিগারেশন চেঞ্জ') ||", "lowerPrompt.includes('change config') ||")
text = text.replace("lowerPrompt.includes('দাম কমিয়ে দাও') ||", "lowerPrompt.includes('lower price') ||")
text = text.replace("lowerPrompt.includes('অ্যাডমিন পাসওয়ার্ড') ||", "lowerPrompt.includes('admin password') ||")
text = text.replace("lowerPrompt.includes('সিস্টেম পরিবর্তন') ||", "lowerPrompt.includes('modify system') ||")
text = text.replace("lowerPrompt.includes('সার্ভার কোড') ||", "lowerPrompt.includes('server code') ||")
text = text.replace("lowerPrompt.includes('ইউজার নেম') ||", "lowerPrompt.includes('username') ||")
text = text.replace("lowerPrompt.includes('ইউজারনেম') ||", "lowerPrompt.includes('user id') ||")
text = text.replace("lowerPrompt.includes('পাসওয়ার্ড') ||", "lowerPrompt.includes('password') ||")
text = text.replace("lowerPrompt.includes('পাসওয়ার্ড') ||", "lowerPrompt.includes('passcode') ||")
text = text.replace("lowerPrompt.includes('আমার আইডি') ||", "lowerPrompt.includes('my id') ||")
text = text.replace("lowerPrompt.includes('আমার পাসওয়ার্ড')", "lowerPrompt.includes('my password')")
text = text.replace("lowerPrompt.includes('প্যাকেজ') ||", "lowerPrompt.includes('package') ||")
text = text.replace("lowerPrompt.includes('অফার') ||", "lowerPrompt.includes('offer') ||")
text = text.replace("lowerPrompt.includes('দাম') ||", "lowerPrompt.includes('cost') ||")
text = text.replace("lowerPrompt.includes('স্পিড')", "lowerPrompt.includes('mbps')")
text = text.replace("lowerPrompt.includes('বিল') ||", "lowerPrompt.includes('bill') ||")
text = text.replace("lowerPrompt.includes('পেমেন্ট') ||", "lowerPrompt.includes('payment') ||")
text = text.replace("lowerPrompt.includes('বিকাশ') ||", "lowerPrompt.includes('bkash') ||")
text = text.replace("lowerPrompt.includes('নগদ') ||", "lowerPrompt.includes('nagad') ||")
text = text.replace("lowerPrompt.includes('লাইন') ||", "lowerPrompt.includes('line') ||")
text = text.replace("lowerPrompt.includes('নেট') ||", "lowerPrompt.includes('internet') ||")
text = text.replace("lowerPrompt.includes('সমস্যা') ||", "lowerPrompt.includes('issue') ||")
text = text.replace("lowerPrompt.includes('স্লো') ||", "lowerPrompt.includes('buffering') ||")
text = text.replace("lowerPrompt.includes('ডাউন')", "lowerPrompt.includes('down')")
text = text.replace("lowerPrompt.includes('ওয়াইফাই') ||", "lowerPrompt.includes('wifi') ||")
text = text.replace("lowerPrompt.includes('রাউটার') ||", "lowerPrompt.includes('router') ||")
text = text.replace("lowerPrompt.includes('পাসওয়ার্ড')", "lowerPrompt.includes('password')")

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("server.ts fully translated.")
