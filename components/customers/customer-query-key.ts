export const customerKeys = {
    all: ["customers"] as const,

    combobox: (search: string) =>
        [...customerKeys.all, "combobox", search] as const,
};