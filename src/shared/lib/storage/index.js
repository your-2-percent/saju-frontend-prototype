export function makeEmptyMyeongSik() {
    return {
        id: "tmp-" + Date.now(), // 임시 id
        name: "",
        birthDay: "",
        birthTime: "",
        gender: "",
        birthPlace: { name: "", lat: 0, lon: 0 },
        relationship: "",
        memo: "",
        folder: "미분류",
        mingSikType: "자시",
        DayChangeRule: "자시일수론",
        favorite: false,
        // 선택 필드
        corrected: undefined,
        correctedLocal: "",
        ganjiText: "",
        ganji: "",
        dir: "forward"
    };
}
