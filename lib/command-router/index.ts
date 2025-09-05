// AXIOM_DEMO_UI — WEB CORE
// Canvas: C25 — lib/command-router/index.ts
// Purpose: Small command router to handle user terminal commands (read-only in PUBLIC).

export type CommandCtx = {
    print: (line: string) => void;
    error: (line: string) => void;
    help: (topic?: string) => void;
  };
  
  export type CommandHandler = (args: string[], ctx: CommandCtx) => Promise<void> | void;
  
  export interface CommandSpec {
    name: string;
    describe: string;
    usage: string;
    run: CommandHandler;
  }
  
  export class CommandRouter {
    private map = new Map<string, CommandSpec>();
  
    register(cmd: CommandSpec){
      this.map.set(cmd.name, cmd);
      return this;
    }
  
    has(name: string){ return this.map.has(name); }
    get(name: string){ return this.map.get(name); }
  
    async dispatch(input: string, ctx: CommandCtx){
      const clean = input.trim();
      if (!clean){ ctx.help(); return; }
      const [name, ...args] = tokenize(clean);
      const cmd = this.get(name);
      if (!cmd){ ctx.error(`unknown command: ${name}`); ctx.help(); return; }
      try {
        await cmd.run(args, ctx);
      } catch (e:any) {
        ctx.error(e?.message || String(e));
      }
    }
  
    list(){ return Array.from(this.map.values()); }
  }
  
  export function tokenize(s: string): string[]{
    // simple shell-like splitter (no quotes/escapes for now)
    return s.split(/\s+/g).filter(Boolean);
  }
  
  // Built-in help
  export function createHelp(router: CommandRouter): CommandSpec {
    return {
      name: 'help',
      describe: 'show available commands',
      usage: 'help [name]',
      run: (args, ctx) => {
        const [name] = args;
        if (!name){
          const cmds = router.list();
          ctx.print('Available commands:');
          for (const c of cmds){ ctx.print(`  - ${c.name} — ${c.describe}`); }
          return;
        }
        const cmd = router.get(name);
        if (!cmd) return ctx.error(`no such command: ${name}`);
        ctx.print(`${cmd.name}: ${cmd.describe}`);
        ctx.print(`usage: ${cmd.usage}`);
      }
    };
  }
  