let data = "";

process.stdin.on("data", chunk => {
    data += chunk;
});

process.stdin.on("end", () => {
    try {
        const parsed = JSON.parse(data);

        Object.entries(parsed).forEach(([key, value]) => {
        console.log(`${key}:`);

        if (typeof value === "string") {
            console.log(value);
        } else {
            console.log(JSON.stringify(value, null, 2));
        }

        console.log("");
        });
    } catch {
        console.log(data);
    }
});