import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsageData, CompareResult } from '../models';

@Injectable({ providedIn: 'root' })
export class UsageService {
  constructor(private http: HttpClient) {}

  getUsage(scope: string, scopeId: string, start: string, end: string, forceRefresh = false): Observable<UsageData> {
    let params = new HttpParams()
      .set('scope', scope)
      .set('start', start)
      .set('end', end);
    if (scopeId) {
      params = params.set('scope_id', scopeId);
    }
    if (forceRefresh) {
      params = params.set('force_refresh', 'true');
    }
    return this.http.get<UsageData>(`${environment.apiUrl}/usage`, { params });
  }

  compare(keyA: string, keyB: string, start: string, end: string, forceRefresh = false): Observable<CompareResult> {
    let params = new HttpParams()
      .set('key_a', keyA)
      .set('key_b', keyB)
      .set('start', start)
      .set('end', end);
    if (forceRefresh) {
      params = params.set('force_refresh', 'true');
    }
    return this.http.get<CompareResult>(`${environment.apiUrl}/usage/compare`, { params });
  }
}
