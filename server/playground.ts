import path from 'path';
import crypto from 'crypto';
/* 
A PLACE FOR PLAYING AROUND WITH CODE; 
EXPERIMENT,TEST,ETC.
*/

const str = "this_is_some_random_folder_nam";
const hash = crypto.createHash('sha256').update(str).digest('hex');

console.log(`Hash for "${str}": ${hash}`);

