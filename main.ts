import { existsSync } from "@std/fs/exists";
import { join } from "@std/path";


console.log('Init...');
if (!existsSync(join(Deno.cwd(), 'release'))) {
    Deno.mkdirSync(join(Deno.cwd(), 'release'));
    console.log('Create release folder');
}
console.log('Init success');
