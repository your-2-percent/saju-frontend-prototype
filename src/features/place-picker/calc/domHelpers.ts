export function getSuggestionsEl(): HTMLUListElement | null {
  return document.getElementById("suggestions") as HTMLUListElement | null;
}

export function getItems(container: HTMLElement): HTMLElement[] {
  const items = Array.from(container.querySelectorAll<HTMLElement>('li, [role="option"]'));
  items.forEach((node, idx) => {
    if (!node.getAttribute("role")) node.setAttribute("role", "option");
    node.setAttribute("aria-selected", node === document.activeElement ? "true" : "false");
    node.tabIndex = -1;
    if (!node.id) node.id = `suggestion-item-${idx}`;
  });
  return items;
}

export function focusItem(container: HTMLElement, index: number) {
  const items = getItems(container);
  if (items.length === 0) return;
  const len = items.length;
  let next = index;
  if (next < 0) next = len - 1;
  if (next >= len) next = 0;

  items.forEach((el) => {
    el.tabIndex = -1;
    el.setAttribute("aria-selected", "false");
  });

  const target = items[next];
  target.tabIndex = 0;
  target.setAttribute("aria-selected", "true");
  target.focus();
}
