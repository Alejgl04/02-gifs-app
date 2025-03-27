import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { map, Observable, tap } from 'rxjs';

import { environment } from '@environments/environment';

import type { GiphyResponse } from '../interfaces/giphy.interfaces';
import { Gif } from '../interfaces/gif.interfaces';
import { GifMapper } from '../mapper/gif.mapper';

const GIF_KEY = 'gifs'

const loadFromLocalStorage = () => {
  const gifsFromLocalStorage = localStorage.getItem(GIF_KEY) ?? '{}';
  const gifs = JSON.parse(gifsFromLocalStorage);

  return gifs;
}


@Injectable({providedIn: 'root'})
export class GifService {

  private http = inject(HttpClient);

  trendingGifs = signal<Gif[]>([]);
  tredingGifsLoading = signal(true);

  searchHistory = signal<Record<string, Gif[]>>(loadFromLocalStorage());
  searchHistoryKeys = computed(() => Object.keys(this.searchHistory()));

  constructor() {
    this.loadTrendingGifs();
  }

  saveGifsToLocalStorage = effect(() => {
    const historyString = JSON.stringify(this.searchHistory());
    localStorage.setItem(GIF_KEY, historyString);
  });

  loadTrendingGifs() {
    this.http.get<GiphyResponse>(`${environment.giphyUrl}/gifs/trending`, {
      params: {
        api_key: `${environment.apiKey}`,
        limit: 20,
      },
    }).subscribe( ( resp ) => {

      const gifs = GifMapper.mapGiphyItemsToGifArray(resp.data);
      this.trendingGifs.set(gifs);
      this.tredingGifsLoading.set(false);
      console.log(gifs);
    });
  }

  searchGifs( query:string ): Observable<Gif[]> {
    return this.http.get<GiphyResponse>(`${environment.giphyUrl}/gifs/search`, {
      params: {
        api_key: `${environment.apiKey}`,
        limit: 20,
        q: query,
      },
    }).pipe(
      map( ({data}) => data),
      map( (items) => GifMapper.mapGiphyItemsToGifArray(items)),
      tap( items => {
        this.searchHistory.update(history => ({
          ...history,
          [query.toLowerCase()] : items,
        }));
      })
    );
  }

  loadHistoryGifs( query: string ):Gif[] {
    return this.searchHistory()[query] ?? [];
  }
}
