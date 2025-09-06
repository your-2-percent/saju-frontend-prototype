export default {
    content: [
        "./index.html",
        "./public/index.html",
        "./src/**/*.{ts,tsx,js,jsx}",
    ],
    theme: {
        screens: {
            desk: "991px",
        },
        extend: {}, // 나머지 확장은 여기
    },
    plugins: [],
    darkMode: "class"
};
