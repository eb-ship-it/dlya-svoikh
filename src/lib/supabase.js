import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://owmhksmhqvgpfanftane.supabase.co'
const supabaseKey = 'sb_publishable_PiVzSKj-4fJiO1F9V6kZaw_IxMYQV2b'

export const supabase = createClient(supabaseUrl, supabaseKey)
