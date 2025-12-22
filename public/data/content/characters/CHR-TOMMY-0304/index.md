<style>
.ax-demo {
  --accent: #ffcc00;
  --accent-soft: rgba(255, 204, 0, 0.2);
  background: linear-gradient(135deg, rgba(12, 12, 16, 0.98), rgba(22, 18, 10, 0.92));
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
.ax-demo-card { background: rgba(10, 12, 16, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 14px; border-radius: 12px; }
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

<section class="ax-demo" style="--accent: #ffcc00; --accent-soft: rgba(255, 204, 0, 0.2);">
  <header class="ax-demo-hero">
    <div class="ax-demo-kicker">ZONE · 03_CHARACTERS · STATUS: PUBLISHED</div>
    <h1>Томми «Гром» Громвелл — уличный полководец</h1>
    <p class="ax-demo-sub">Лидер стаи Undercity, превращающий хаос в иерархию удара.</p>
  </header>

  <section class="ax-demo-teaser">
    <p>Томми — природный тест на выживание для тех, кто спускается в Undercity. Он не строит системы, он заставляет их дрожать — через ярость, скорость и показательные расправы.</p>
    <p>Его власть держится на простом кодексе: лояльность награждается, слабость уничтожается. Внизу города это правило звучит громче любых законов.</p>
  </section>

  <section class="ax-demo-facts">
    <div class="ax-demo-grid">
      <article class="ax-demo-card">
        <h3>Роль</h3>
        <p>Альфа-полевик Undercity, лидер боевой стаи и хозяин уличных арен.</p>
      </article>
      <article class="ax-demo-card">
        <h3>Тактика</h3>
        <p>Внезапные рейды, контроль рынков имплантов, публичные демонстрации силы.</p>
      </article>
      <article class="ax-demo-card">
        <h3>Импланты</h3>
        <p>Усилители выносливости, кибернетика «в мясо», ударные перчатки и броня.</p>
      </article>
      <article class="ax-demo-card">
        <h3>Кодекс</h3>
        <p>«Не предавай своих» и «бей первым» — догмы, которые держат стаю вместе.</p>
      </article>
    </div>
  </section>

  <blockquote class="ax-demo-signature">«Сильный не спорит. Он ломает.»</blockquote>

  <section class="ax-demo-gallery">
    <figure>
      <img src="/assets/content/tommy.png" alt="Tommy Gromwell portrait" loading="lazy" />
      <figcaption>Томми — уличный инстинкт, ставший властью.</figcaption>
    </figure>
  </section>

  <section class="ax-demo-related">
    <h3>Related</h3>
    <ul>
      <li>Thunder Dogs — стая доминирования</li>
      <li>Grom Fist — фирменный ударный имплант</li>
      <li>T-Collar — броня шейного узла</li>
      <li>Bloodtech — нестабильные усилители</li>
    </ul>
  </section>
</section>
