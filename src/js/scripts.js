class FontAdjust {
    constructor() {
        this.parent = document.querySelector('.js-adjust-font');
        this.up = this.parent.querySelector('.js-adjust-font-increase');
        this.down = this.parent.querySelector('.js-adjust-font-decrease');
        this.max = parseInt(this.parent.getAttribute('data-max'));
        this.min = parseInt(this.parent.getAttribute('data-min'));
        this.base = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fs').slice(0, -2));

        if (this.up && this.down) this.init();
    }

    init() {
        this.up.addEventListener('click', _ => this.increase());
        this.down.addEventListener('click', _ => this.decrease());
    }

    setVariable(value) {
        document.documentElement.style.setProperty('--fs', value + 'px');
    }

    decrease() {
        this.base -=1;
        this.setVariable(this.base);
        this.checkValue();
    }

    increase() {
        this.base +=1;
        this.setVariable(this.base);
        this.checkValue();
    }

    checkValue() {
        this.base == this.max ? this.up.classList.add('disabled') : this.up.classList.remove('disabled')
        this.base == this.min ? this.down.classList.add('disabled') : this.down.classList.remove('disabled')
    }
}

const globalFontAdjust = new FontAdjust();
const API_KEY = '?api_key=15d382b5ad53d6b7c9569e8b85954ffa';
const API_PATH = 'https://api.themoviedb.org/3/';
const body = document.body;
const header = document.querySelector('header');
let mobile = false;
let genresArray = undefined;

// Add basic functionality to make the website more accessible and respect the user's preferences in design
// I plan on using these css classes in the next stages of developmen, after having finished the JS functionality requirements 

window.onload = () => {
    if (window.matchMedia('(prefers-reduced-motion)').matches) body.classList.add('reduced-motion');
    if (window.matchMedia('(prefers-color-scheme: light)').matches) body.classList.add('light-theme');

    // I may use this if I have time to handle bugs or orientation change events after the initial build and requirements are fullfilled
    if (window.matchMedia('only screen and (hover: none) and (pointer: coarse)').matches) {
        body.classList.add('mobile');
        mobile = true;
    }
};

const trigger = document.querySelector('.js-info-trigger');
const infoContent = document.querySelector('.js-info-content');

trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    infoContent.classList.toggle('visible');
});

infoContent.addEventListener('click', e => e.stopPropagation());

body.addEventListener('click', _ => infoContent.classList.remove('visible'));

// Global debounce function

function debounce(callback, interval) {
    let debounceTimeoutId;

    return function (e) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = setTimeout(() => callback, interval);
    };
}

// Compute Screen height 

const computeHeight = !(() => {
    body.style.setProperty('--screenHeight', window.innerHeight + 'px');
    body.style.setProperty('--headerHeight', header.clientHeight + 'px');
})();

window.addEventListener('resize', debounce(computeHeight, 300));


class ItemDetails {
    constructor(element) {
        this.element = element;
        this.id = element.getAttribute('data-id');
        this.movieEndpoint = `${API_PATH}movie/${this.id}`;
        this.trailerEndpoint = `${this.movieEndpoint}/videos${API_KEY}`;
        this.reviewsEndpoint = `${this.movieEndpoint}/reviews${API_KEY}`;
        this.similarEndpoint = `${this.movieEndpoint}/similar${API_KEY}`;
        this.youtubeURL = 'https://www.youtube.com/embed/';
        this.activeDecor = document.querySelector('.decor-img');
        this.withData = false;
        this.imgReady = false;

        this.init();
    }

    init() {

        this.element.addEventListener('click', () => {

            // Hide active decorative image if any
            if (this.imgReady) {
                this.hideImage();
            }

            const active = document.querySelector('.item.expanded');

            // Stop video from playing when change in between movies

            if (active) {
                const iframe = active.querySelector('iframe');
                if (iframe) {
                    const iframeSrc = iframe.src;
                    iframe.src = iframeSrc;
                }
            }

            // Reset rest of the items
            if (!this.element.classList.contains('expanded')) {
                if (active) active.classList.remove('expanded');
            } else {
                this.element.classList.remove('expanded');
                return;
            }

            if (!this.element.classList.contains('expanded') && !this.imgReady) {
                this.imageChange(this.element.getAttribute('data-imgurl'));
            } else if (this.imgReady) {
                this.activeDecor.addEventListener('transitionend', () => {
                    this.imageChange(this.element.getAttribute('data-imgurl'));
                }, { once: true });
            }

            // Not stable in terms of animation performance
            // window.scrollTo(0,this.element.offsetTop);
            this.element.classList.add('expanded');

            // Fetch additional data if not already there
            // So only the first time a movie is clicked
            // All the above code has to do with animations and changes in statuses
            // While the fetching of data is needed only once and only if a movie is clicked 
            // Otherwise we will be getting a large amount of data making the page slow even though the user may 
            // never choose to view them
            if (!this.withData) {
                let request = new Request(this.movieEndpoint + API_KEY);
                const detailsDiv = document.createElement("div");
                detailsDiv.classList = 'item-additional absolute flex rounded';

                detailsDiv.addEventListener('click', e => e.stopPropagation());

                // I could have used Promise all to have the data for all requests,
                // description, reviews, video and then construct the html without manipulating the order with CSS
                // But it is not arbitrary to have all the values

                // I could also have used async await, with an await for each fetch but I didn't need to do that as well
                // Or wanted to actually block the code execution

                // TO DO: Performance improvement
                // async function fetchDetails() {
                //     const [moviesResponse, categoriesResponse] = await Promise.allSettled([
                //         fetch(detailsRequest),
                //         fetch(trailerRequest),
                //         fetch(reviewRequest)
                //     ]);
                //     const details = await detailsResponse.json();
                //     const trailer = await trailerResponse.json();
                //     const reviews = await reviewsResponse.json();
                //     return [details, trailer, reviews];
                // }

                // fetchDetails().then(([details, trailer, reviews]) => {
                //     Remove loader and handle data
                // }).catch(error => {
                //     // Handle Erros
                // });


                fetch(request)
                    .then((response) => response.json())
                    .then((response) => {
                        const description = document.createElement("div");
                        description.classList = 'item-description'
                        description.innerHTML = '';

                        if (response.title != undefined) description.innerHTML += `<h4><a href="${response.homepage}" target="_black">${response.title}</a></h4>`;

                        if (response.overview) description.innerHTML += `<p>${response.overview}</p>`;

                        detailsDiv.append(description);

                    })
                    .catch((error) => {
                        //alert('in movie with id ' + this.id + ' ' + error);
                        console.log(error.stack);
                    });

                request = new Request(this.reviewsEndpoint);

                fetch(request)
                    .then((response) => response.json())
                    .then((response) => {
                        const reviewsWrapper = document.createElement("div");
                        reviewsWrapper.classList = 'item-reviews flex';

                        const reviewItem = (e) => {
                            const div = document.createElement("div");
                            div.classList = 'review';

                            div.innerHTML = `<div class="review-author">User ${e.author_details.username} said: </div>
                                <p class="review-content">${e.content}</p>`;
                            return div;
                        };
                        response.results.forEach((e, i) => {
                            if (i < 2) {
                                reviewsWrapper.append(reviewItem(e));
                            } else {
                                return;
                            }
                        });

                        detailsDiv.append(reviewsWrapper);
                    })
                    .catch((error) => {
                        //alert('in reviews for movie with id ' + this.id + ' ' + error);
                        console.log(error.stack);
                    });

                request = new Request(this.trailerEndpoint);

                fetch(request)
                    .then((response) => response.json())
                    .then((response) => {
                        //console.log(JSON.stringify(response, null, '\t'));
                        const trailer = response.results.filter((e) => { return e.type === 'Teaser' || e.type === 'Trailer' })[0];

                        //console.log(trailer);
                        if (trailer && trailer.key !== undefined) {
                            const iframe = document.createElement("iframe");
                            iframe.src = this.youtubeURL + trailer.key;
                            detailsDiv.append(iframe);
                        }
                    })
                    .catch((error) => {
                        //alert('in reviews for movie with id ' + this.id + ' ' + error);
                        console.log(error.stack);
                    });

                this.element.append(detailsDiv);
                this.withData = true;
            }
        });
    }

    imageChange(imgUrl) {
        this.activeDecor.src = imgUrl;
        this.imgReady = true;
        if (this.activeDecor.complete) {
            this.activeDecor.classList.add('ready');
        } else {
            this.activeDecor.addEventListener("load", (e) => e.target.classList.add('ready'), { once: true });
        }
    }

    hideImage() {
        this.activeDecor.src = undefined;
        this.activeDecor.classList.remove('ready');
    }
}
class NowPlaying {
    constructor() {
        this.endpont = 'movie/now_playing';
        this.now_playing = `${API_PATH}${this.endpont}${API_KEY}&page=1`;
        this.genres = `${API_PATH}genre/movie/list${API_KEY}`;
        this.totalPages = 0;
        this.wrapper = document.querySelector('.js-now-playing');
        this.genresArray = undefined;
        this.hasScroll = false;
        this.dummyElement = document.createElement('div');
        this.dummyElement.classList = 'item-dummy animated';
        this.scrollObserver;
        this.page = 0;
        this.getGenres().then( _ => this.fetchMovies());
    }

    item(id, title, poster = undefined, release_date = undefined, genres = undefined, vote_average = undefined, overview = undefined) {

        const item = document.createElement('button');
        const imgUrl = poster ? `https://image.tmdb.org/t/p/original/${poster}` : './src/assets/movie.png';
        item.classList = 'item border-box';
        item.dataset.id = id;
        item.dataset.imgurl = imgUrl;
        //item.href= "javascript:;";
        //item.setAttribute('tabindex', 0);

        const pxPercentage = Math.PI * 40 * (100 - (vote_average * 10)) / 100;

        item.innerHTML = `
            <div class="relative">
                <div class="item-imgWrapper rounded">
                    <img src="${imgUrl}" alt="${title} thumbnail" class="lazy-load">
                </div>
                <div class="item-content absolute smooth-medium rounded flex-column">
                    <h3>${title}</h3>
                    <div class="item-details">
                        <div>Released on: ${release_date}</div>
                        <div>Genres: ${genres}</div>
                        <div class="flex animation-wrapper">Average vote: 
                            <span class="animated-circle" data-percentage="${vote_average * 10}" style="--percentage:${pxPercentage}px">
                                <svg id="svg" width="50" height="50" viewPort="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
                                    <circle r="20" cx="25" cy="25" fill="transparent" stroke-dasharray="${Math.PI * 40}" stroke-dashoffset="0"></circle>
                                    <circle id="bar" r="20" cx="25" cy="25" fill="transparent" stroke-dasharray="${Math.PI * 40}" stroke-dashoffset="0"></circle>
                                </svg>
                                <span class="absolute">${vote_average}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>`;

        item.querySelector('.lazy-load').addEventListener('load', (e) => e.target.classList.add('ready'));

        return item;
    }

    async getGenres() {
        const request = new Request(this.genres);

        return await
            fetch(request)
                .then((response) => response.json())
                .then((response) => {
                    this.genresArray = genresArray = response.genres;
                    return;
                })
                .catch((error) => {
                    console.log(error + ' while requesting movies genres.');
                    return;
                });
    }

    fetchMovies() {

        this.page += 1;

        const request = new Request(this.now_playing + '&page=' + this.page);
        //const dummyElement = document.createElement('div');
        //dummyElement.classList = 'item-dummy animated';

        const scrollTrigger = document.createElement('div');
        scrollTrigger.classList = 'scroll-trigger';

        async function movies() {
            let response = await fetch(request);
            return response = await response.json();
        };

        movies().then((response) => {

                // Remove loader
                this.wrapper.parentNode.classList.remove('loading');

                if (this.page == 1) {
                    this.totalPages = response.total_pages;

                    const countElement = document.createElement('div');
                    countElement.classList = 'items-results-info';
                    countElement.append(`Found ${response.total_results} results, playing until ${response.dates.maximum}`);
                    this.wrapper.prepend(countElement);
                }

                response.results.forEach((e, i) => {
                    let genres = '';
                    if (this.genresArray) {
                        e.genre_ids.forEach(e => {
                            genres += this.genresArray.find(item => item.id === e).name + ' ';
                        });
                    } else {
                        // In case the genres request is not succesful and we cannot match genre id with genre name just display a list of ids
                        genres = JSON.stringify(e.genre_ids);
                    }

                    const element = this.item(e.id, e.title, e.poster_path, e.release_date, genres, e.vote_average);
                    this.wrapper.append(element);
                    if ((i + 1) % 2 == 0) {
                        this.wrapper.append(this.dummyElement.cloneNode());
                    }
                    new ItemDetails(element);
                });

                this.wrapper.append(scrollTrigger);

                if (this.totalPages > 1 && !this.hasScroll) {
                    // Inititate Infinite Scrolling
                    this.scrollObserver = new ScrollObserver(this.wrapper);
                    this.hasScroll = true;
                } else if (this.hasScroll) {
                    this.scrollObserver.updateTrigger();
                }

                if (this.totalPages === this.page && this.hasScroll) {
                    this.scrollObserver.remove();
                }
            })
            .catch((error) => {
                // Remove loader
                this.wrapper.parentNode.classList.remove('loading');
                // Give some feedback
                const errorItem = document.createElement('div');
                errorItem.classList = 'error-message align-center row';
                errorItem.innerHTML = `Error during the fetch request probably due to bad connection.`;
                this.wrapper.append(errorItem);
                console.log(error.stack);
            });

        // fetch(request)
        //     .then((response) => response.json())
        //     .then((response) => {

        //         if (this.page == 1) {
        //             this.totalPages = response.total_pages;

        //             const countElement = document.createElement('div');
        //             countElement.classList = 'items-results-info';
        //             countElement.append(`Found ${response.total_results} results, playing until ${response.dates.maximum}`);
        //             this.wrapper.prepend(countElement);
        //         }

        //         response.results.forEach((e, i) => {
        //             let genres = '';
        //             if (this.genresArray) {
        //                 e.genre_ids.forEach(e => {
        //                     genres += this.genresArray.find(item => item.id === e).name + ' ';
        //                 });
        //             } else {
        //                 // In case the genres request is not succesful and we cannot match genre id with genre name just display a list of ids
        //                 genres = JSON.stringify(e.genre_ids);
        //             }

        //             const element = this.item(e.id, e.title, e.poster_path, e.release_date, genres, e.vote_average);
        //             this.wrapper.append(element);
        //             if ((i + 1) % 2 == 0) {
        //                 this.wrapper.append(this.dummyElement.cloneNode());
        //             }
        //             new ItemDetails(element);
        //         });

        //         this.wrapper.append(scrollTrigger);

        //         if (this.totalPages > 1 && !this.hasScroll) {
        //             // Inititate Infinite Scrolling
        //             this.scrollObserver = new ScrollObserver(this.wrapper);
        //             this.hasScroll = true;
        //         } else if (this.hasScroll) {
        //             this.scrollObserver.updateTrigger();
        //         }

        //         if (this.totalPages === this.page && this.hasScroll) {
        //             this.scrollObserver.remove();
        //         }
        //     })
        //     .catch((error) => {
        //         alert('in movies' + error);
        //         console.log(error.stack);
        //     });
    }
}

const globalNowPlaying = new NowPlaying();
/* Observer js */

class ScrollObserver {
    constructor(element) {
        this.element = element;
        this.trigger = this.element.querySelector('.scroll-trigger:last-child');
        this.options = {
            //root: element,
            rootMargin: '0px',
            threshold: 0
        };

        this.observer;
        this.init();
    }

    init() {
        const nowplaying = this.element.classList.contains('js-now-playing');
        
        this.observer = new IntersectionObserver((entries, self) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    //entry.target.classList.add('passed');
                    entry.target.remove(); // It messes with the order and how I have already implented the animation using dummy items
                    self.unobserve(entry.target);
                    nowplaying ? globalNowPlaying.fetchMovies() : globalSearchData.loadData()
                }
            });
        }, this.options);

        this.runObserve();
    }

    updateTrigger() {
        this.trigger = this.element.querySelector('.scroll-trigger:last-child');
        this.runObserve();
    }

    runObserve() {
        this.observer.observe(this.trigger);
    }

    remove() {
        this.observer.disconnect();
    }
}
class SearchData {
    constructor() {
        this.list = document.querySelector('.js-search-list');
        this.wrapper = this.list.parentNode.parentNode;
        this.input = document.querySelector('.js-search-input');
        this.endpoint = `${API_PATH}search/movie${API_KEY}&include_adult=false&page=`;
        this.page = 0;
        this.results = undefined;
        this.totalPages = 0;
        this.hasScroll = false;
        this.valueHolder = document.querySelector('.js-value');
        this.closeBtn = document.querySelector('.js-search-close');
        this.controller = new AbortController();
        this.signal = this.controller.signal;
        this.value = '';
        this.request = undefined;
        this.otherWrapper = document.querySelector('.js-now-playing').parentNode;
        this.dummyElement = document.createElement('div');
        this.dummyElement.classList = 'item-dummy animated';
        this.scrollObserver;

        this.init();
    }

    init() {

        this.closeBtn.addEventListener('click', _ => this.closeSearch());
        // Initiate search
        this.input.addEventListener('input', this.debounce(this.doSearch, 300));
    }

    debounce(callback, interval) {
        let debounceTimeoutId;
        const self = this;

        return function (...args) {
            clearTimeout(debounceTimeoutId);
            debounceTimeoutId = setTimeout(() => callback.apply(self, args), interval);
        };
    }

    loadData() {
        const scrollTrigger = document.createElement('div');
        scrollTrigger.classList = 'scroll-trigger';

        const signal = this.signal;
        this.page += 1;

        const request = new Request(this.endpoint + this.page + '&query=' + encodeURI(this.value));

        // The commented code below is still in progress

        // async function movies() {
        //     return this.request = await fetch(request, { signal });
        // };

        // movies().then((response) => response.json())
        // .then((response) => {

        //     this.list.parentNode.classList.remove('loading');

        //     if (this.page == 1) {
        //         this.totalPages = response.total_pages;
        //     }

        //     if (response.results.length) {
        //         response.results.forEach((e, i) => {
        //             let genres = '';
        //             if (genresArray) {
        //                 e.genre_ids.forEach(e => {
        //                     genres += genresArray.find(item => item.id === e).name + ' ';
        //                 });
        //             } else {
        //                 // In case the genres request is not succesful and we cannot match genre id with genre name just display a list of ids
        //                 genres = JSON.stringify(e.genre_ids);
        //             }

        //             const element = this.item(e.id, e.title, e.poster_path, e.release_date, genres, e.vote_average);
        //             this.list.append(element);
        //             if ( (i+1) % 2 == 0) {
        //                 this.list.append(this.dummyElement.cloneNode());
        //             }
        //             new ItemDetails(element);
        //         });
        //         this.list.append(scrollTrigger);
        //     } else {
        //         // response.results.length == 0
        //         this.list.classList.add('empty');
        //         this.hasScroll = false;
        //         this.scrollObserver.remove();
        //         this.request = undefined;
        //         return;
        //     }

        //     if (this.totalPages > 1 && !this.hasScroll) {
        //         // Inititate Infinite Scrolling
        //         this.scrollObserver = new ScrollObserver(this.list);
        //         this.hasScroll = true;
        //     } else if (this.hasScroll) {
        //         this.scrollObserver.updateTrigger();
        //     }

        //     if (this.totalPages == this.page && this.hasScroll) {
        //         this.scrollObserver.remove();
        //     }

        //     this.request = undefined;
        // })
        // .catch((error) => {
        //     if (this.list.innerHTML == '') {
        //         this.list.parentNode.classList.remove('loading');
        //         const errorItem = document.createElement('div');
        //         errorItem.classList = 'error-message';
        //         errorItem.innerHTML = `Error during the fetch request while searching.`;
        //         this.list.append(errorItem);
        //     }
        //     console.log(error.stack);
        // });

        this.request = fetch(request, { signal })
            .then((response) => response.json())
            .then((response) => {

                this.list.parentNode.classList.remove('loading');

                if (this.page == 1) {
                    this.totalPages = response.total_pages;
                }

                if (response.results.length) {
                    response.results.forEach((e, i) => {
                        let genres = '';
                        if (genresArray) {
                            e.genre_ids.forEach(e => {
                                genres += genresArray.find(item => item.id === e).name + ' ';
                            });
                        } else {
                            // In case the genres request is not succesful and we cannot match genre id with genre name just display a list of ids
                            genres = JSON.stringify(e.genre_ids);
                        }

                        const element = this.item(e.id, e.title, e.poster_path, e.release_date, genres, e.vote_average);
                        this.list.append(element);
                        if ((i + 1) % 2 == 0) {
                            this.list.append(this.dummyElement.cloneNode());
                        }
                        new ItemDetails(element);
                    });
                    this.list.append(scrollTrigger);
                } else {
                    // response.results.length == 0
                    this.list.classList.add('empty');
                    this.hasScroll = false;
                    this.scrollObserver.remove();
                    this.request = undefined;
                    return;
                }

                if (this.totalPages > 1 && !this.hasScroll) {
                    // Inititate Infinite Scrolling
                    this.scrollObserver = new ScrollObserver(this.list);
                    this.hasScroll = true;
                } else if (this.hasScroll) {
                    this.scrollObserver.updateTrigger();
                }

                if (this.totalPages == this.page && this.hasScroll) {
                    this.scrollObserver.remove();
                }

                this.request = undefined;
            })
            .catch((error) => {
                if (this.list.innerHTML == '') {
                    this.list.parentNode.classList.remove('loading');
                    const errorItem = document.createElement('div');
                    errorItem.classList = 'error-message';
                    errorItem.innerHTML = `Error during the fetch request while searching.`;
                    this.list.append(errorItem);
                }
                console.log(error.stack);
            });
    }

    doSearch() {
        const value = this.input.value;

        // Kill Previous Search and rendering
        if (this.request) this.controller.abort();
        this.list.innerHTML = '';
        //const signal = this.signal;

        if (this.list.classList.contains('empty')) this.list.classList.remove('empty');

        if (!this.wrapper.classList.contains('searching')) {
            this.wrapper.classList.add('searching');

            // This is in case we have scrolled down and then make a search
            // So that it goes to the top again and not keep the current scrollY value
            // We need the scrollBehavior set to auto so that it happes immediately without animation
            document.documentElement.style.scrollBehavior = 'auto';
            setTimeout(() => window.scrollTo(0, 0), 5);
            setTimeout(() => document.documentElement.style.scrollBehavior = 'smooth', 5);

            this.wrapper.addEventListener('transitionend', () => {
                this.otherWrapper.classList.remove('active');
                this.otherWrapper.setAttribute('hidden', true);
                this.wrapper.style.position = 'absolute';
            }, { once: true });
        }

        // Otherwise it throws an error if the connection is bad and 
        // the fetch request in loadmovies is not finished
        if (globalNowPlaying.hasScroll) globalNowPlaying.scrollObserver.remove();

        // Check if Results Wrapper is visible
        if (value.length > 3) {
            this.valueHolder.innerHTML = value;
            this.value = value;

            this.loadData();

        } else {
            this.closeSearch();
        }
    }

    closeSearch() {
        this.input.value = '';
        if (globalNowPlaying.hasScroll) globalNowPlaying.scrollObserver.updateTrigger();
        this.hasScroll = false;
        if (this.scrollObserver) this.scrollObserver.remove();
        this.otherWrapper.classList.add('active');
        this.otherWrapper.removeAttribute('hidden');
        //this.wrapper.style.position = '';
        this.wrapper.style.display = 'none';
        this.wrapper.classList.remove('searching');
        this.wrapper.style = '';
        this.list.parentNode.classList.add('loading');
        //this.wrapper.addEventListener('transitionend', () => {
        //this.otherWrapper.classList.add('active');
        // this.otherWrapper.removeAttribute('hidden');
        //}, {once: true});
    }

    item(id, title, poster = undefined, release_date = undefined, genres = undefined, vote_average = undefined, overview = undefined) {

        const item = document.createElement('button');
        const imgUrl = poster ? `https://image.tmdb.org/t/p/original/${poster}` : './src/assets/movie.png';
        item.classList = 'item border-box';
        item.dataset.id = id;
        item.dataset.imgurl = imgUrl;

        const pxPercentage = Math.PI * 40 * (100 - (vote_average * 10)) / 100;

        item.innerHTML = `
            <div class="relative">
                <div class="item-imgWrapper rounded">
                    <img src="${imgUrl}" alt="${title} thumbnail" class="lazy-load">
                </div>
                <div class="item-content absolute smooth-medium rounded flex-column">
                    <h3>${title}</h3>
                    <div class="item-details">
                        <div>Released on: ${release_date}</div>
                        <div>Genres: ${genres}</div>
                        <div class="flex animation-wrapper">Average vote: 
                            <span class="animated-circle" data-percentage="${vote_average * 10}" style="--percentage:${pxPercentage}px">
                                <svg id="svg" width="50" height="50" viewPort="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
                                    <circle r="20" cx="25" cy="25" fill="transparent" stroke-dasharray="${Math.PI * 40}" stroke-dashoffset="0"></circle>
                                    <circle id="bar" r="20" cx="25" cy="25" fill="transparent" stroke-dasharray="${Math.PI * 40}" stroke-dashoffset="0"></circle>
                                </svg>
                                <span class="absolute">${vote_average}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>`;

        item.querySelector('.lazy-load').addEventListener('load', (e) => e.target.classList.add('ready'));

        return item;
    }
}

const globalSearchData = new SearchData();