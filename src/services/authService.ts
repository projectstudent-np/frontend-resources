import { supabase } from '../app/supabase';

export interface RegisterData {
    cpf: string;
    email: string;
    password: string;
}

export const authService = {
    async register(data: RegisterData) {
        const cleanCPF = data.cpf.replace(/\D/g, '');

        // Check CPF uniqueness before signing up
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('cpf', cleanCPF)
            .maybeSingle();

        if (existing) throw new Error('An account already exists with this CPF.');

        // signUp – pass CPF in metadata so the DB trigger can store it
        // Email confirmation must be DISABLED in Supabase Auth settings
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: { cpf: cleanCPF },
            },
        });

        if (authError) {
            if (authError.status === 429) {
                throw new Error('Too many attempts. Please wait a few minutes and try again.');
            }
            throw authError;
        }

        if (!authData.user) {
            throw new Error('Account was not created. Make sure email confirmation is disabled in Supabase.');
        }

        // Profile row is created automatically by the DB trigger on_auth_user_created.
        // No manual insert needed here.
        return authData;
    },

    /** Login using CPF + password.
     *  Resolves the email from a Supabase RPC, then authenticates with Supabase Auth.
     */
    async loginWithCPF(cpf: string, password: string) {
        const { data: email, error: lookupError } = await supabase.rpc(
            'get_email_by_cpf',
            { p_cpf: cpf }
        );

        if (lookupError) throw new Error('Error looking up account.');
        if (!email) throw new Error('No account found with this CPF.');

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email as string,
            password,
        });

        if (error) {
            throw new Error('Invalid CPF or password.');
        }
        return data;
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },
};
