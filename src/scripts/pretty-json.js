let data = "";

process.stdin.on("data", chunk => {
    data += chunk;
});

process.stdin.on("end", () => {
    try {
        const parsed = JSON.parse(data);

        for (const key in parsed) {
            if (typeof parsed[key] === "string") {
                parsed[key] = parsed[key].replace(/\\n/g, "\n");
            }
        }

        console.log(JSON.stringify(parsed, null, 2));
    } catch {
        console.log(data);
    }
});