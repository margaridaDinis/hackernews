import '../styles/main.scss';
import moment from 'moment';

class HackerNews {

    constructor() {
        this.endPoint = 'https://hacker-news.firebaseio.com/v0';
        this.params = (new URL(document.location)).searchParams;
        this.pageParam = parseInt(this.params.get('page'), 10);
        this.loadBar = document.querySelector('.stories__loader');
        this.listContainer = document.getElementById('stories__container');
        this.defaultListType = 'topstories';
        this.storiesPerPage = 30;
        this.currentPage = this.pageParam || 1;
        this.sliceStart = this.pageParam ? (this.pageParam * this.storiesPerPage) - this.storiesPerPage : 0;
        this.sliceEnd = this.sliceStart + this.storiesPerPage;
        this.totalStoriesLength = 0;
    }

    getTypeParam() {
        let search = window.location.search;
        let param = search.split( '=' );
        const type = param[1];
        return ( param.indexOf('type') !== -1 ) ? type : this.defaultListType;
    }

    makeRequest(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onload = () => {
                if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
                reject(xhr.statusText);
            };
            xhr.onerror = () => reject(xhr.statusText);
            xhr.send();
        });
    }

    async processList(url) {
        try {
            const storiesList = await this.makeRequest(url);
            this.totalStoriesLength = storiesList.length;
            const stories = storiesList.slice(this.sliceStart, this.sliceEnd);
            return stories.map(story => this.makeRequest(`${this.endPoint}/item/${story}.json`));
        } catch (e) {
            return [false, e];
        }
    }

    processElements(stories) {
        this.loadBar.parentNode.removeChild(this.loadBar);
        for (let i = 0; i < this.storiesPerPage; i += 1) {
            if (typeof stories[i] === 'undefined') break;

            const article = document.createElement('article');
            article.classList.add('list-group-item');
            stories[i].then((story) => {
                article.innerHTML = this.createElement(i, story);
            });
            this.listContainer.appendChild(article);
        }

        Promise.all(stories).then(() => {
            this.processPagination();
        });
    }

    processPagination() {
        const pages = Math.ceil(this.totalStoriesLength / this.storiesPerPage);
        let page = 1;
        if (this.currentPage > 1) {
            this.createPagination(this.currentPage - 1, '&laquo;');
        }
        if (this.currentPage < pages) {
            this.createPagination(this.currentPage + 1, '&raquo;');
        }
    }

    processError(e) {
        this.listContainer.innerHTML = this.createError(e);
    }

    createElement(index, element) {
        const points = element.score === 1 ? 'point' : 'points';
        const position = index + 1 + this.sliceStart;
        const comments = element.descendants ? `| ${element.descendants} comments` : '';

        return `<a href="${element.url}" target="_blank" 
                class="list-group-item-action flex-column align-items-start">
                <header class="d-flex w-100 justify-content-md-between flex-column flex-md-row">
                    <small class="order-md-2 align-self-end">${element.score} ${points}</small>
                    <h2 class="mb-1 h5"><small>${position}.</small> ${element.title}</h2>
                </header>
                <footer>
                    <small>by ${element.by}, ${moment(element.time * 1000).fromNow()} ${comments}</small>
                </footer>
            </a>`;
    }

    createPagination(number, title = number) {
        const paginationContainer = document.getElementById('navigation__container');
        const page = document.createElement('li');
        const query = this.getPageQuery(number);
        if (this.currentPage === number) page.classList.add('active');

        page.classList.add('page-item');
        page.innerHTML = `<a class="page-link" href="${query}">${title}</a>`;
        paginationContainer.appendChild(page);
    }

    getPageQuery(number) {
        let query = `?page=${number}`;
        if (window.location.search.indexOf('type') !== -1) {
            query = `?type=${this.getTypeParam()}&page=${number}`;
        }
        return query;
    }

    createError(error) {
        return `<div class="alert alert-danger" role="alert">
                Oops! We couldn't find what you were looking for...
                <hr>${error}</div>`;
    }

    handleListSpecificElements(page) {
        const navItem = document.querySelector(`[data-type=${page}]`);
        const pageTitle = navItem.innerText;
        const getPageTitle = document.getElementById('page-title');
        const originalDocumentTitle = document.title;

        getPageTitle.innerText = pageTitle;
        navItem.classList.add('active');
        document.title = `${pageTitle} | ${originalDocumentTitle}`;
    }
}

const list = new HackerNews();
list.processList(`${list.endPoint}/${list.getTypeParam()}.json`).then((storiesList) => {
    if (storiesList[0] === false) return list.processError(storiesList[1]);
    list.handleListSpecificElements(list.getTypeParam());
    return list.processElements(storiesList);
});
