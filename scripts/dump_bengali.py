import re
import glob

bengali_re = re.compile(r"[\u0980-\u0994\u0995-\u09b9\u09bc-\u09e3\u09e6-\u09fa]")
files = glob.glob("src/**/*.*", recursive=True)

with open("scripts/bengali_dump.txt", "w", encoding="utf-8") as out:
    for f in sorted(files):
        with open(f, "r", encoding="utf-8") as file:
            lines = file.readlines()
        matches = [(i+1, line) for i, line in enumerate(lines) if bengali_re.search(line)]
        if matches:
            out.write(f"===== FILE: {f} ({len(matches)} lines) =====\n")
            for lno, text in matches:
                out.write(f"{lno}: {text}")
            out.write("\n")

print("Dumped all Bengali lines to scripts/bengali_dump.txt")
