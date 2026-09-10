"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProductSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(`/p/${encodeURIComponent(value)}`);
  }

  return (
    <form className="search-form" onSubmit={submit}>
      <label htmlFor="product-search"><strong>Part Number</strong></label>
      <input
        id="product-search"
        className="input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Example: 0241-75484"
        autoCapitalize="characters"
        autoCorrect="off"
      />
      <button className="button" type="submit">Find Product</button>
    </form>
  );
}
