import axios, { AxiosInstance } from 'axios';

const DONKI_BASE_URL = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get';

export interface DonkiCME {
  activityID: string;
  catalog: string;
  startTime: string;
  sourceLocation: string;
  activeRegionNum: number;
  link: string;
  note: string;
  instruments?: Array<{ displayName: string }>;
  cmeAnalyses?: Array<{
    time21_5: string;
    latitude: number;
    longitude: number;
    halfAngle: number;
    speed: number;
    type: string;
    isMostAccurate: boolean;
    note: string;
  }>;
  linkedEvents?: Array<{ activityID: string }>;
}

export interface DonkiFlare {
  flrID: string;
  catalog: string;
  instruments?: Array<{ displayName: string }>;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number;
  note: string;
  linkedEvents?: Array<{ activityID: string }>;
}

export interface DonkiSEP {
  sepID: string;
  eventTime: string;
  instruments?: Array<{ displayName: string }>;
  linkedEvents?: Array<{ activityID: string }>;
}

export interface DonkiGST {
  gstID: string;
  startTime: string;
  allKpIndex?: Array<{
    observedTime: string;
    kp: number;
    source: string;
  }>;
  allKpIndexWithEstimated?: Array<{
    observedTime: string;
    kp: number;
    estimatedKp?: number;
    source: string;
  }>;
  linkedEvents?: Array<{ activityID: string }>;
  note: string;
}

export interface DonkiIPS {
  activityID: string;
  catalog: string;
  location: string;
  eventTime: string;
  instruments?: Array<{ displayName: string }>;
  linkedEvents?: Array<{ activityID: string }>;
}

export interface DonkiNotification {
  messageID: string;
  messageURL: string;
  messageType: string;
  messageIssueTime: string;
  messageBody: string;
}

export interface DonkiWSAEnlil {
  simulationID: number;
  modelCompletionTime: string;
  au: number;
  estimatedShockArrivalTime: string;
  estimatedDuration: number;
  rmin_re: number;
  isEarthGB: boolean;
  cmeInputs?: Array<{
    cmeStartTime: string;
    latitude: number;
    longitude: number;
    speed: number;
    halfAngle: number;
    time21_5: string;
    cmeid: string;
  }>;
  impactList?: Array<{
    isGlancingBlow: boolean;
    location: string;
    arrivalTime: string;
  }>;
}

export class DonkiApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: DONKI_BASE_URL,
      timeout: 30000,
    });
  }

  private async get<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.get<T[]>(endpoint, { params });
        return response.data || [];
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const retriable = !status || status === 429 || (status >= 500 && status < 600);
          if (retriable && attempt < maxAttempts) {
            const backoffMs = 500 * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          const message = error.response?.data?.error?.message || error.message;
          throw new Error(`DONKI API Error: ${status ? `${status} - ` : ''}${message}`);
        }
        throw error;
      }
    }
    return [];
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async getCMEs(
    startDate?: Date,
    endDate?: Date,
    catalog: string = 'M2M_CATALOG',
    version: string = 'Latest'
  ): Promise<DonkiCME[]> {
    const params: Record<string, string> = {
      catalog,
      version,
    };
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get<DonkiCME>('/CME', params);
  }

  async getCMEAnalysis(
    startDate?: Date,
    endDate?: Date,
    catalog: string = 'M2M_CATALOG',
    version: string = 'Latest'
  ): Promise<any[]> {
    const params: Record<string, string> = {
      catalog,
      version,
    };
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get('/CMEAnalysis', params);
  }

  async getFlares(
    startDate?: Date,
    endDate?: Date,
    catalog: string = 'M2M_CATALOG',
    classType: string = 'ALL',
    version: string = 'Latest'
  ): Promise<DonkiFlare[]> {
    const params: Record<string, string> = {
      catalog,
      class: classType,
      version,
    };
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get<DonkiFlare>('/FLR', params);
  }

  async getSEPs(
    startDate?: Date,
    endDate?: Date,
    catalog: string = 'ALL',
    version: string = 'Latest'
  ): Promise<DonkiSEP[]> {
    const params: Record<string, string> = {
      catalog,
      version,
    };
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get<DonkiSEP>('/SEP', params);
  }

  async getGSTs(
    startDate?: Date,
    endDate?: Date,
    catalog: string = 'ALL',
    version: string = 'Latest'
  ): Promise<DonkiGST[]> {
    const params: Record<string, string> = {
      catalog,
      version,
    };
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get<DonkiGST>('/GST', params);
  }

  async getIPSs(
    startDate?: Date,
    endDate?: Date,
    location: string = 'ALL',
    catalog: string = 'ALL',
    version: string = 'Latest'
  ): Promise<DonkiIPS[]> {
    const params: Record<string, string> = {
      location,
      catalog,
      version,
    };
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get<DonkiIPS>('/IPS', params);
  }

  async getNotifications(
    startDate?: Date,
    endDate?: Date,
    type: string = 'all'
  ): Promise<DonkiNotification[]> {
    const params: Record<string, string> = { type };
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get<DonkiNotification>('/notifications', params);
  }

  async getWSAEnlilSimulations(
    startDate?: Date,
    endDate?: Date
  ): Promise<DonkiWSAEnlil[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);
    return this.get<DonkiWSAEnlil>('/WSAEnlilSimulations', params);
  }
}
