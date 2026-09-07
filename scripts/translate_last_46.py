import re
import os

def clean(filepath, pairs):
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    orig = text
    for old, new in pairs:
        text = text.replace(old, new)
    if text != orig:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Cleaned {filepath}")

# 1. BandwidthMonitor.tsx
clean("src/components/BandwidthMonitor.tsx", [
    ("যেকোনো Interfaceে ক্লিক করে লাইভ গ্রাফ দেখুন", "Click any interface to view live graph"),
])

# 2. ClientAiAssistant.tsx
clean("src/components/ClientAiAssistant.tsx", [
    ("আসসালামু আলাইকুম **${client.name}**! 👋\\nআমি আপনার **নেক্সোরা নেটওয়ার্ক এআই সাপোর্ট (NexoraAI)**।\\n\\nআপনার ইন্টারনেট সংযোগ, বিলের মেয়াদ বা কোনো সমস্যা রয়েছে কি? নিচে সরাসরি লিখুন বা কুইক বাটনে চাপ দিন।",
     "Hello **${client.name}**! 👋\\nI am your **Nexora Network AI Support Assistant (NexoraAI)**.\\n\\nDo you have any questions regarding your internet connection, billing expiry, or need support? Type below or choose a quick prompt."),
    ("আসসালামু আলাইকুম! 👋\\nআমি **নেক্সোরা নেটওয়ার্ক এআই সাপোর্ট অ্যাসিস্ট্যান্ট**।\\n\\nআপনার অ্যাকাউন্ট Username, পাসওয়ার্ড পুনরুদ্ধার বা লাইনের তথ্যের জন্য আমাকে আপনার নিবন্ধিত Phone Number জানাতে পারেন।",
     "Hello! 👋\\nI am your **Nexora Network AI Support Assistant**.\\n\\nTo look up your account username, password recovery, or connection details, please provide your registered phone number or User ID."),
    ("দুঃখিত, সার্ভারের সাথে সংযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", "Sorry, temporary connection issue with server. Please try again."),
    ("নেটওয়ার্ক সমস্যার কারণে এআই রেসপন্স পাওয়া যায়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করুন।", "AI response unavailable due to network issue. Please check your connection."),
    ("✅ **মাইক্রোটিক অটো-ফিক্স ও রিসেট সফল হয়েছে!**\\n\\n${data.message}\\n\\n💡 **করণীয়:** আপনার হোম ওয়াইফাই রাউটারটি ৫ সেকেন্ড বন্ধ রেখে চালু করুন (Reboot)। আপনার ইন্টারনেট লাইন এখন সম্পূর্ণ সচল ও সক্রিয়!",
     "✅ **MikroTik Auto-Fix & Reset Successful!**\\n\\n${data.message}\\n\\n💡 **Next Step:** Turn off your home Wi-Fi router for 5 seconds and turn it back on (Reboot). Your internet connection is now active!"),
    ("⚠️ **অটো-ফিক্স ব্যর্থ হয়েছে:** ${data.error || 'মাইক্রোটিক সাড়া দেয়নি'}\\n\\nঅনুগ্রহ করে আপনার User ID (যেমন: user101) লিখে আবার চেষ্টা করুন।",
     "⚠️ **Auto-Fix Failed:** ${data.error || 'MikroTik did not respond'}\\n\\nPlease enter your User ID (e.g. user101) and try again."),
    ("⚠️ সার্ভার কানেকশনে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করে পুনরায় চেষ্টা করুন।", "⚠️ Server connection issue. Please check your internet connection and try again."),
    ("লাইন ও বিল ডায়াগনস্টিক", "Line & Billing Diagnostic"),
    ("আমার লাইনে প্রবলেম, কি সমস্যা হয়েছে?", "My line is down, what is the issue?"),
    ("লাইনে কি সমস্যা?", "What's wrong with my line?"),
    ("কিভাবে বিল পেমেন্ট করব?", "How do I pay my bill?"),
    ("কিভাবে বিল দেব?", "How to pay bill?"),
    ("আমার ইউজার নেম এবং পাসওয়ার্ড কি?", "What is my username and password?"),
    ("আইডি ও পাসওয়ার্ড কি?", "My ID & Password?"),
    ("আমার বিলের মেয়াদ কতদিন আছে?", "When does my subscription expire?"),
    ("মেয়াদ চেক", "Check Expiry"),
    ("পৃথিবীর বর্তমান বিজ্ঞান ও প্রযুক্তির খবর কি?", "Latest technology updates"),
    ("অলরাউন্ডার হেল্প", "General Help"),
    ("বিকাশ/নগদে বিল পরিশোধ করুন", "Pay Bill via bKash/Nagad"),
    ("মাইক্রোটিক লাইন রিসেট হচ্ছে...", "Resetting MikroTik line..."),
    ("⚡ ১-ক্লিকে অটো-ফিক্স ও রিসেট করুন", "⚡ 1-Click Auto-Fix & Reset"),
    ("এআই সিস্টেম ও লাইন যাচাই করছে...", "AI checking system & connection..."),
    ("সিকিউরড ভেরিফিকেশন ও পলিসি এনফোর্সড", "Secured Verification & Policy Enforced"),
    ("placeholder=\"বিল পেমেন্ট, লাইন সমস্যা বা যেকোনো প্রশ্ন লিখুন...\"", "placeholder=\"Ask about bill payment, line issues, or any question...\""),
])

# 3. SmsReminderModal.tsx
clean("src/components/SmsReminderModal.tsx", [
    ("SMS টেক্সট কপি করা হয়েছে!", "SMS text copied to clipboard!"),
    ("কপি করা সম্ভব হয়নি", "Could not copy text"),
    ("📱 ${client.name}-কে SMS Sendোর অ্যাপ ওপেন হয়েছে!", "📱 SMS app opened for ${client.name}!"),
    ("💬 ${client.name}-কে WhatsApp রিমাইন্ডার Sendো হচ্ছে!", "💬 Sending WhatsApp reminder to ${client.name}!"),
    ("✅ ${client.name}-এর জন্য SMS রিমাইন্ডার লগ সংরক্ষণ করা হয়েছে", "✅ SMS reminder log saved for ${client.name}"),
    ("title=\"Send SMS Subscription Reminder (এসএমএস রিমাইন্ডার)\"", "title=\"Send SMS Subscription Reminder\""),
    ("Select Template (টেমপ্লেট নির্বাচন করুন):", "Select Template:"),
    ("SMS Content (মেসেজ বডি):", "SMS Content (Message Body):"),
    ("বাংলা / Unicode", "Unicode"),
    ("placeholder=\"রিমাইন্ডার মেসেজ লিখুন...\"", "placeholder=\"Type reminder message...\""),
    ("Send SMS (সরাসরি মেসেজ Send)", "Send SMS"),
    ("Send WhatsApp (হোয়াটসঅ্যাপ)", "Send WhatsApp"),
    ("কপি হয়েছে", "Copied!"),
    ("Copy Text (কপি)", "Copy Text"),
])

# 4. AdminProfilePage.tsx
clean("src/components/pages/AdminProfilePage.tsx", [
    ("অ্যাডমিন প্রোফাইল সফলভাবে আপডেট করা হয়েছে!", "Admin profile updated successfully!"),
    ("ফাইল সাইজ ১.৫ এমবি এর বেশি হতে পারবে না!", "File size must not exceed 1.5 MB!"),
    ("প্রোফাইল পিকচার সিলেক্ট করা হয়েছে। নিচে সেভ বাটনে ক্লিক করুন।", "Profile picture selected. Click Save button below."),
    ("Password কনফার্মেশন মিলছে না!", "Password confirmation does not match!"),
    ("Change Password সফল হয়েছে!", "Password changed successfully!"),
    ("অ্যাডমিনিস্ট্রেটর অ্যাকাউন্ট তথ্য, সিকিউরিটি ক্রেডেনশিয়াল ও ডিভাইস সেশন কন্ট্রোল।", "Administrator account info, security credentials, and device session control."),
    ("Address / ঠিকানা", "Address"),
])

# 5. BillingPage.tsx
clean("src/components/pages/BillingPage.tsx", [
    ("জন Subscriberের জন্য", "subscribers"),
    ("আপনি কি নিশ্চিত যে Invoice", "Are you sure you want to delete Invoice"),
])

print("Translation round complete.")
