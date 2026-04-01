import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { APIKey } from '../models';

@Injectable({ providedIn: 'root' })
export class KeysService {
  constructor(private http: HttpClient) {}

  getKeys(): Observable<APIKey[]> {
    return this.http.get<APIKey[]>(`${environment.apiUrl}/keys`);
  }
}
