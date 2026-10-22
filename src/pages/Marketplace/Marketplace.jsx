import React, { useContext, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, ShoppingBag, X } from "lucide-react";
import api from "../../api/axiosInstance";
import { AuthContext } from "../../context/AuthContext";
import "./Marketplace.css";
import { marketApi, rupees, useMarketQuery } from "./marketplace-api";
import { Field, Status } from "./Shared";
import Operations from "./Operations";
import ImageUploader from "./ImageUploader";

const blankVariant = () => ({
  size: "",
  sku: "",
  weightRange: "",
  active: true,
  piecesPerPack: 1,
  packsPerCarton: 1,
  retailPrice: 0,
  retailSalePrice: null,
  stockPacks: 0,
  retailStock: 0,
  wholesaleStock: 0,
  wholesaleCartonPrice: 0,
  minimumWholesaleQuantity: 1,
  lowStockThreshold: 10,
  wholesalePricingTiers: [],
});
const blankProduct = () => ({
  name: "",
  slug: "",
  brand: "",
  category: "",
  shortDescription: "",
  description: "",
  images: [],
  diaperType: "",
  sellingMode: "both",
  inventoryStrategy: "shared",
  status: "draft",
  featured: false,
  sizes: [blankVariant()],
});

export default function Marketplace() {
  const { appUser } = useContext(AuthContext);
  const { section = "dashboard" } = useParams();
  if (!["ROL_1", "ROL_2", "Admin", "SuperAdmin"].includes(appUser?.role))
    return <Status>Marketplace administrator access required.</Status>;
  return (
    <section className="mp-page">
      <header className="mp-heading">
        <div>
          <span>Retail & wholesale</span>
          <h1>
            <ShoppingBag /> Diaper marketplace
          </h1>
          <p>Manage products, carton pricing and customer orders.</p>
        </div>
      </header>
      <nav className="mp-tabs">
        {[
          "dashboard",
          "products",
          "categories",
          "orders",
          "inventory",
          "wholesale-pricing",
        ].map((item) => (
          <NavLink key={item} to={`/admin/marketplace/${item}`}>
            {item.replace("-", " ")}
          </NavLink>
        ))}
      </nav>
      {section === "categories" ? (
        <Categories />
      ) : section === "products" || section === "wholesale-pricing" ? (
        <Products wholesale={section === "wholesale-pricing"} />
      ) : (
        <Operations section={section} />
      )}
    </section>
  );
}

function Categories() {
  const query = useMarketQuery("categories", "/categories");
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (category) => {
    setBusy(true);
    setError("");
    try {
      if (category._id)
        await api.put(`${marketApi}/categories/${category._id}`, category);
      else await api.post(`${marketApi}/categories`, { name });
      setName("");
      await cache.invalidateQueries({ queryKey: ["marketplace-admin"] });
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mp-panel">
      <h2>Product categories</h2>
      <p>Only active categories appear in the customer marketplace.</p>
      <form
        className="mp-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          save({});
        }}
      >
        <input
          aria-label="Category name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
        />
        <button disabled={busy || !name.trim()}>
          <Plus size={17} />
          Add category
        </button>
      </form>
      {error && (
        <p role="alert" className="mp-error">
          {error}
        </p>
      )}
      {query.isLoading ? (
        <Status>Loading categories…</Status>
      ) : query.isError ? (
        <Status>
          Unable to load categories.{" "}
          <button onClick={() => query.refetch()}>Retry</button>
        </Status>
      ) : !query.data?.length ? (
        <Status>No categories yet. Add your first category above.</Status>
      ) : (
        query.data.map((c) => (
          <div className="mp-list-row" key={c._id}>
            <strong>{c.name}</strong>
            <span>{c.active ? "Active" : "Hidden"}</span>
            <button
              disabled={busy}
              onClick={() => save({ ...c, active: !c.active })}
            >
              {c.active ? "Hide" : "Activate"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function Products({ wholesale }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const query = useMarketQuery(
    "products",
    `/products?page=${page}&search=${encodeURIComponent(search)}${wholesale ? "&mode=wholesale" : ""}`,
  );
  const categories = useMarketQuery("categories", "/categories");
  return (
    <>
      <div className="mp-toolbar mp-product-toolbar">
        <input
          aria-label="Search products"
          placeholder="Search products or brands"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button onClick={() => query.refetch()}>
          <RefreshCw size={17} />
          Refresh
        </button>
        <button onClick={() => setEditor(blankProduct())}>
          <Plus size={17} />
          Add product
        </button>
      </div>
      {wholesale && (
        <p className="mp-note">
          Edit a product to set carton prices, minimum carton quantities and
          volume tiers. Equivalent per-pack prices are derived from the carton
          price.
        </p>
      )}
      {query.isLoading ? (
        <Status>Loading products…</Status>
      ) : query.isError ? (
        <Status>
          Unable to load products.{" "}
          <button onClick={() => query.refetch()}>Retry</button>
        </Status>
      ) : !query.data?.items.length ? (
        <Status>
          No products found. Add a category, then create a product.
        </Status>
      ) : (
        <div className="mp-product-grid">
          {query.data.items.map((p) => (
            <article key={p._id} className="mp-panel mp-product">
              <div className="mp-image">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                ) : (
                  <ShoppingBag size={38} aria-hidden="true" />
                )}
                <span className={`mp-product-status ${p.status}`}>{p.status}</span>
              </div>
              <div className="mp-product-info">
                <div className="mp-product-overline"><span>{p.brand || "Unbranded"}</span><span>{p.category?.name || "Uncategorized"}</span></div>
                <h2>{p.name}</h2>
                <p className="mp-product-mode">{p.shortDescription || `${p.sellingMode} sales`}</p>
                <div className="mp-product-sizes">
                  {(p.sizes || []).filter((v) => v.active).map((v) => <span key={v._id || v.size}>{v.size}</span>)}
                  {!(p.sizes || []).some((v) => v.active) && <span>No active sizes</span>}
                </div>
                <button
                  className="mp-product-edit"
                onClick={() =>
                  setEditor({ ...p, category: p.category?._id || p.category })
                }
              >
                Edit product & pricing <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="mp-toolbar">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {query.data?.pages || 1}
        </span>
        <button
          disabled={!query.data || page >= query.data.pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      {editor && (
        <ProductEditor
          initial={editor}
          categories={categories.data || []}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

function ProductEditor({ initial, categories, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cache = useQueryClient();
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const variant = (index, key, value) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  const save = async (e) => {
    e.preventDefault();
    if (uploading || busy) return;
    setBusy(true);
    setError("");
    try {
      if (form._id) await api.put(`${marketApi}/products/${form._id}`, form);
      else await api.post(`${marketApi}/products`, form);
      await cache.invalidateQueries({ queryKey: ["marketplace-admin"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mp-overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Product editor"
        className="mp-editor"
      >
        <header>
          <h2>{form._id ? "Edit product" : "New product"}</h2>
          <button
            type="button"
            aria-label="Close editor"
            disabled={busy || uploading}
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <form onSubmit={save}>
          <div className="mp-fields">
            {[
              ["name", "Product name"],
              ["slug", "Slug (optional)"],
              ["brand", "Brand"],
              ["diaperType", "Diaper type"],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  required={key === "name"}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </Field>
            ))}
            <Field label="Category">
              <select
                required
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">Select category</option>
                {categories
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Selling mode">
              <select
                value={form.sellingMode}
                onChange={(e) => set("sellingMode", e.target.value)}
              >
                {["both", "retail", "wholesale"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Inventory strategy (fixed after creation)">
              <select
                disabled={!!form._id}
                value={form.inventoryStrategy}
                onChange={(e) => set("inventoryStrategy", e.target.value)}
              >
                <option value="shared">Shared stock — canonical packs</option>
                <option value="separate">
                  Separate retail packs / wholesale cartons
                </option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {["draft", "active", "archived"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Featured">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
            </Field>
          </div>
          <Field label="Short description">
            <input
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              maxLength={300}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <ImageUploader
            images={form.images}
            onChange={(images) => set("images", images)}
            onBusyChange={setUploading}
            disabled={busy || uploading}
          />
          <h3>Sizes & variants</h3>
          <p className="mp-note">
            Existing inventory is read-only here. Use Inventory to add or remove
            stock safely.
          </p>
          {form.sizes.map((v, i) => (
            <div className="mp-variant" key={v._id || i}>
              <div className="mp-toolbar">
                <h3>
                  {v.size || `Variant ${i + 1}`}
                  {!v.active ? " (hidden)" : ""}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    v._id
                      ? variant(i, "active", !v.active)
                      : set(
                          "sizes",
                          form.sizes.filter((_, n) => n !== i),
                        )
                  }
                >
                  {v._id
                    ? v.active
                      ? "Hide size"
                      : "Restore size"
                    : "Remove size"}
                </button>
              </div>
              <div className="mp-fields">
                {[
                  ["size", "Size"],
                  ["sku", "SKU"],
                  ["weightRange", "Weight range"],
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      required={key !== "weightRange"}
                      value={v[key] || ""}
                      onChange={(e) => variant(i, key, e.target.value)}
                    />
                  </Field>
                ))}
                {[
                  ["piecesPerPack", "Pieces per pack", 1],
                  ["packsPerCarton", "Packs per carton", 1],
                  ["retailPrice", "Retail price / pack (₹)", 0],
                  ["retailSalePrice", "Sale price / pack (optional)", 0],
                  ["wholesaleCartonPrice", "Wholesale price / carton (₹)", 0],
                  ["minimumWholesaleQuantity", "Minimum wholesale cartons", 1],
                  [
                    "lowStockThreshold",
                    "Low-stock threshold (packs / cartons)",
                    0,
                  ],
                  ...(form.inventoryStrategy === "shared"
                    ? [["stockPacks", "Shared stock (packs)", 0]]
                    : [
                        ["retailStock", "Retail stock (packs)", 0],
                        ["wholesaleStock", "Wholesale stock (cartons)", 0],
                      ]),
                ].map(([key, label, min]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      min={min}
                      step={key.toLowerCase().includes("price") ? "0.01" : "1"}
                      disabled={
                        !!v._id &&
                        [
                          "stockPacks",
                          "retailStock",
                          "wholesaleStock",
                        ].includes(key)
                      }
                      value={v[key] ?? ""}
                      onChange={(e) =>
                        variant(
                          i,
                          key,
                          key === "retailSalePrice" && e.target.value === ""
                            ? null
                            : Number(e.target.value),
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
              <p>
                Wholesale equivalent:{" "}
                {rupees(v.wholesaleCartonPrice / (v.packsPerCarton || 1))} /
                pack · {v.packsPerCarton * v.piecesPerPack} pieces / carton
              </p>
              <h4>Volume pricing (cartons)</h4>
              <p className="mp-note">
                Start at MOQ, use consecutive ranges, leave the last maximum
                empty for unlimited.
              </p>
              {v.wholesalePricingTiers.map((t, n) => (
                <div className="mp-fields" key={n}>
                  {[
                    ["minQuantity", "Minimum cartons"],
                    ["maxQuantity", "Maximum cartons"],
                    ["pricePerCarton", "Price per carton (₹)"],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        type="number"
                        min="1"
                        step={key === "pricePerCarton" ? "0.01" : "1"}
                        value={t[key] ?? ""}
                        onChange={(e) =>
                          variant(
                            i,
                            "wholesalePricingTiers",
                            v.wholesalePricingTiers.map((tier, j) =>
                              j === n
                                ? {
                                    ...tier,
                                    [key]:
                                      e.target.value === "" &&
                                      key === "maxQuantity"
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : tier,
                            ),
                          )
                        }
                      />
                    </Field>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      variant(
                        i,
                        "wholesalePricingTiers",
                        v.wholesalePricingTiers.filter((_, j) => j !== n),
                      )
                    }
                  >
                    Remove tier
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  variant(i, "wholesalePricingTiers", [
                    ...v.wholesalePricingTiers,
                    {
                      minQuantity: v.minimumWholesaleQuantity,
                      maxQuantity: null,
                      pricePerCarton: v.wholesaleCartonPrice,
                    },
                  ])
                }
              >
                Add tier
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("sizes", [...form.sizes, blankVariant()])}
          >
            <Plus size={16} />
            Add size
          </button>
          {error && (
            <p className="mp-error" role="alert">
              {error}
            </p>
          )}
          <footer>
            <button
              type="button"
              disabled={busy || uploading}
              onClick={onClose}
            >
              Cancel
            </button>
            <button disabled={busy || uploading}>
              {busy ? "Saving…" : "Save product"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
