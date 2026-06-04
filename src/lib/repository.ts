import type { AppData } from './types'
import { emptyAppData } from './types'
import { isCloudEnabled, supabase } from './supabase'

// The whole program/log dataset is stored as a single JSON document.
// Local mode -> browser localStorage. Cloud mode -> one row in Supabase.

const LOCAL_KEY = 'tpm.appdata.v1'
const CLOUD_ROW_ID = 'default'

export interface Repository {
  readonly mode: 'cloud' | 'local'
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
}

const localRepository: Repository = {
  mode: 'local',
  async load() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (!raw) return emptyAppData()
      return { ...emptyAppData(), ...(JSON.parse(raw) as AppData) }
    } catch {
      return emptyAppData()
    }
  },
  async save(data) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
  },
}

const cloudRepository: Repository = {
  mode: 'cloud',
  async load() {
    const { data, error } = await supabase!
      .from('app_state')
      .select('data')
      .eq('id', CLOUD_ROW_ID)
      .maybeSingle()
    if (error) throw error
    if (!data) return emptyAppData()
    return { ...emptyAppData(), ...(data.data as AppData) }
  },
  async save(data) {
    const { error } = await supabase!
      .from('app_state')
      .upsert({ id: CLOUD_ROW_ID, data, updated_at: new Date().toISOString() })
    if (error) throw error
  },
}

export const repository: Repository = isCloudEnabled ? cloudRepository : localRepository
