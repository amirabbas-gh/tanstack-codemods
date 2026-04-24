import { createServerFn } from "@tanstack/react-start";


// CODEMOD: review — server fn — add `.validator(...)` before `.handler(...)` if it accepts params
export const create = createServerFn().handler(async () => {
  return true;
});

// CODEMOD: review — server fn — add `.validator(...)` before `.handler(...)` if it accepts params
export const remove = createServerFn().handler(async (id: string) => {
  return null;
});
