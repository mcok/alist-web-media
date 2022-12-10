window.onload = ()=>{
    document.getElementsByName('body')
    loader.loadCss('index.css')
    loader.loadScript('artplayer.js')
    loader.loadScript('axios.min.js').then(function (){
        window.axios.defaults.headers.common['authorization'] = window.localStorage.getItem('token');
    })
    loader.loadScript('vue.js')
        .then(function (){
            let div = document.createElement('div');
            div.id = 'media'
            document.body.appendChild(div);
            loader.loadScript('app.js')
        })
}

var loader = {
    rootPath:'https://mcok.github.io/alist-web-media/',
    loadScript(src){
        return new Promise((resolve,reject)=>{
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = this.rootPath+src;
            let loadTimeoutCheck = setTimeout(()=>{
                reject()
            },15000)
            script.onload = ()=>{
                clearInterval(loadTimeoutCheck)
                resolve()
            }
            document.body.appendChild(script);
        })
    },
    loadCss(src){
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = this.rootPath+src;
        document.body.appendChild(link);
    }
}

