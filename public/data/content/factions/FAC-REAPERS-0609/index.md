<style>
.ax-demo {
  --accent: #ff7a00;
  --accent-soft: rgba(255, 122, 0, 0.22);
  background: linear-gradient(135deg, rgba(12, 10, 8, 0.98), rgba(20, 12, 6, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}
.ax-demo * { box-sizing: border-box; }
.ax-demo-hero { display: grid; gap: 8px; margin-bottom: 16px; }
.ax-demo-kicker { font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); }
.ax-demo-hero h1 { margin: 0; font-size: 28px; }
.ax-demo-sub { margin: 0; color: #c6ccdc; font-size: 15px; }
.ax-demo-teaser { margin-bottom: 16px; color: #e6e9f3; }
.ax-demo-teaser p { margin: 0 0 10px; }
.ax-demo-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.ax-demo-card { background: rgba(12, 10, 8, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 14px; border-radius: 12px; }
.ax-demo-card h3 { margin: 0 0 6px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); }
.ax-demo-card p { margin: 0; color: #d6d9e6; }
.ax-demo-signature { margin: 18px 0; padding: 14px 16px; border-left: 3px solid var(--accent); background: rgba(255, 255, 255, 0.04); color: #dfe3f2; }
.ax-demo-gallery { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 16px; }
.ax-demo-gallery figure { margin: 0; }
.ax-demo-gallery img { width: 100%; border-radius: 12px; display: block; }
.ax-demo-gallery figcaption { font-size: 12px; color: #b6bccd; margin-top: 6px; }
.ax-demo-related h3 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); }
.ax-demo-related ul { margin: 0; padding-left: 18px; color: #d5d9e5; }
.ax-demo-related li { margin-bottom: 6px; }
</style>

<section class="ax-demo" style="--accent: #ff7a00; --accent-soft: rgba(255, 122, 0, 0.22);">
  <header class="ax-demo-hero">
    <div class="ax-demo-kicker">ZONE · 06_FACTIONS · STATUS: PUBLISHED</div>
    <h1>Reapers — изгнанники лимбо</h1>
    <p class="ax-demo-sub">Каста выживших, чей кодекс звучит просто: живой значит опасный.</p>
  </header>

  <section class="ax-demo-teaser">
    <p>Reapers — фракция тех, кого город отбросил. Они выжили в лимбе, перегрузили импланты и сделали боль своей религией. У них нет лидера — есть только сила.</p>
    <p>Их кварталы растут снизу вверх, как вирус. Где исчезает контроль корпораций, там появляются их метки и ритуалы.</p>
  </section>

  <section class="ax-demo-facts">
    <div class="ax-demo-grid">
      <article class="ax-demo-card">
        <h3>Философия</h3>
        <p>Опасность — единственный закон. Слабость не имеет права на жизнь.</p>
      </article>
      <article class="ax-demo-card">
        <h3>Касты</h3>
        <p>Wraiths, Gutgrinders, Druglords, Scraphacks — каждая играет свою роль.</p>
      </article>
      <article class="ax-demo-card">
        <h3>Территория</h3>
        <p>Reapers Blocks и окрестные сектора Undercity, рынки мутаций и арены.</p>
      </article>
      <article class="ax-demo-card">
        <h3>Арсенал</h3>
        <p>Мясные импланты, грязные пушки и химические усилители боя.</p>
      </article>
    </div>
  </section>

  <blockquote class="ax-demo-signature">«Если ты жив — ты должен быть опасен.»</blockquote>

  <section class="ax-demo-gallery">
    <figure>
      <img src="/assets/content/reapers.png" alt="Reapers sigil" loading="lazy" />
      <figcaption>Знак изгнанников, выросший из боли и хрома.</figcaption>
    </figure>
  </section>

  <section class="ax-demo-related">
    <h3>Related</h3>
    <ul>
      <li>Bloodtech — симбиотические модули</li>
      <li>Undercity — зоны влияния</li>
      <li>Labrat Hollow — подпольные лаборатории</li>
      <li>Chrome Syndicate — чёрный рынок имплантов</li>
    </ul>
  </section>
</section>
