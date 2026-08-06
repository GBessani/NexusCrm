import { createClient } from '@/lib/supabase/client'
import type { Produto, Contato, ContatoComDesejos, NotificacaoStatus } from '@/lib/types'

async function requireUserId(): Promise<string> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')
  return user.id
}

// =====================================================================
// PRODUTOS
// =====================================================================
export async function listarProdutos(): Promise<Produto[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('nome', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function criarProduto(nome: string): Promise<Produto> {
  const supabase = createClient()
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('produtos')
    .insert({ id: crypto.randomUUID(), user_id, nome: nome.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarProduto(id: string, nome: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('produtos')
    .update({ nome: nome.trim() })
    .eq('id', id)
  if (error) throw error
}

export async function excluirProduto(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) throw error
}

// =====================================================================
// CONTATOS
// =====================================================================
export async function listarContatos(): Promise<Contato[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contatos')
    .select('*')
    .order('nome', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function criarContato(input: {
  nome: string
  telefone: string
  opt_in?: boolean
}): Promise<Contato> {
  const supabase = createClient()
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('contatos')
    .insert({
      id: crypto.randomUUID(),
      user_id,
      nome: input.nome.trim(),
      telefone: input.telefone.replace(/\D/g, ''), // so digitos
      opt_in: input.opt_in ?? true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarContato(
  id: string,
  patch: Partial<Pick<Contato, 'nome' | 'telefone' | 'opt_in'>>
): Promise<void> {
  const supabase = createClient()
  const clean = { ...patch }
  if (clean.telefone) clean.telefone = clean.telefone.replace(/\D/g, '')
  const { error } = await supabase.from('contatos').update(clean).eq('id', id)
  if (error) throw error
}

export async function excluirContato(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('contatos').delete().eq('id', id)
  if (error) throw error
}

// =====================================================================
// WISHLIST (desejos)
// =====================================================================

// contatos com a lista de produtos que cada um deseja
export async function listarContatosComDesejos(): Promise<ContatoComDesejos[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contatos')
    .select('*, wishlist(produtos(*))')
    .order('nome', { ascending: true })
  if (error) throw error
  return (data ?? []).map((c: any) => {
    const { wishlist, ...contato } = c
    const desejos: Produto[] = (wishlist ?? [])
      .map((w: any) => w.produtos)
      .filter(Boolean)
    return { ...(contato as Contato), desejos }
  })
}

export async function adicionarDesejo(
  contatoId: string,
  produtoId: string
): Promise<void> {
  const supabase = createClient()
  const user_id = await requireUserId()
  const { error } = await supabase.from('wishlist').insert({
    id: crypto.randomUUID(),
    user_id,
    contato_id: contatoId,
    produto_id: produtoId,
  })
  // 23505 = unique_violation -> ja desejava esse produto, ignora
  if (error && error.code !== '23505') throw error
}

export async function removerDesejo(
  contatoId: string,
  produtoId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('contato_id', contatoId)
    .eq('produto_id', produtoId)
  if (error) throw error
}

// dado um produto, quem deseja (e aceitou receber avisos)
export async function contatosQueDesejam(
  produtoId: string
): Promise<Contato[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('wishlist')
    .select('contatos(*)')
    .eq('produto_id', produtoId)
  if (error) throw error
  return (data ?? [])
    .map((w: any) => w.contatos)
    .filter((c: Contato | null): c is Contato => !!c && c.opt_in)
}

// =====================================================================
// NOTIFICAÇÕES (histórico de avisos)

export type AvisoHistorico = {
  id: string
  status: NotificacaoStatus
  pdf_origem: string | null
  enviado_em: string | null
  created_at: string
  contato_nome: string | null
  produto_nome: string | null
}

export async function listarNotificacoes(limite = 200): Promise<AvisoHistorico[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notificacoes')
    .select('id, status, pdf_origem, enviado_em, created_at, contatos(nome), produtos(nome)')
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw error
  return (data ?? []).map((n: {
    id: string
    status: NotificacaoStatus
    pdf_origem: string | null
    enviado_em: string | null
    created_at: string
    contatos: { nome: string } | null
    produtos: { nome: string } | null
  }) => ({
    id: n.id,
    status: n.status,
    pdf_origem: n.pdf_origem,
    enviado_em: n.enviado_em,
    created_at: n.created_at,
    contato_nome: n.contatos?.nome ?? null,
    produto_nome: n.produtos?.nome ?? null,
  }))
}