import './StyleGuide.scss'

function StyleGuide() {
  return <div className="style-guide">
            <table>
                <thead>
                    <tr>
                        <th>Color</th>
                        <th>Nombre</th>
                        <th>Variable</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span className="square white"></span></td>
                        <td>Blanco</td>
                        <td><code>var(--color-white)</code></td>
                    </tr>
                    <tr>
                        <td><span className="square orange"></span></td>
                        <td>Naranja</td>
                        <td><code>var(--color-orange)</code></td>
                    </tr>
                    <tr>
                        <td><span className="square brown"></span></td>
                        <td>Marrón</td>
                        <td><code>var(--color-brown)</code></td>
                    </tr>
                    <tr>
                        <td><span className="square green"></span></td>
                        <td>Verde</td>
                        <td><code>var(--color-green)</code></td>
                    </tr>
                </tbody>
            </table>
            <div className='colours'>
                <div className='color'>
                    <span className='square white'></span>
                    <p>Blanco</p>
                </div>
                <div className='color'>
                    <span className='square orange'></span>
                    <p>Naranja</p>
                </div>
                <div className='color'>
                    <span className='square brown'></span>
                    <p>Marrón</p>
                </div>
                <div className='color'>
                    <span className='square green'></span>
                    <p>Verde</p>
                </div>
            </div>
            <h1>Whereas disregard and contempt for human rights have resulted</h1>
            <h2>Whereas disregard and contempt for human rights have resulted</h2>
            <h3>Whereas disregard and contempt for human rights have resulted</h3>
            <h4>Whereas disregard and contempt for human rights have resulted</h4>
            <h5>Whereas disregard and contempt for human rights have resulted</h5>
            <h6>Whereas disregard and contempt for human rights have resulted</h6>

            <p>Whereas disregard and contempt for human rights have resulted</p>
            <div>
                <b>Whereas disregard and contempt for human rights have resulted</b>
            </div>
            <div>
                <strong>Whereas disregard and contempt for human rights have resulted</strong>
            </div>
            <div>
                <span>Whereas disregard and contempt for human rights have resulted</span>
            </div>
            <div>
                 <i>Whereas disregard and contempt for human rights have resulted</i>
            </div>
            <div>
                <small>Whereas disregard and contempt for human rights have resulted</small>
            </div>

            <button>Whereas disregard and contempt for human rights have resulted</button>
            <div>
                <a>Whereas disregard and contempt for human rights have resulted</a>
            </div>
            <div>
                <p><abbr>Whereas disregard and contempt for human rights have resulted</abbr></p>
            </div>
            <div>
                <aside>Whereas disregard and contempt for human rights have resulted</aside>
            </div>
            <div>
                <input value={"Whereas disregard and contempt for human rights have resulted"}></input> 
            </div>
            <nav>
                Whereas disregard and contempt for human rights have resulted
            </nav>
            <select>
                <option>1</option>
                <option>2</option>
                <option>3</option>
            </select>
            <table>
                <tbody>
                    <td>123</td>
                    <td>234</td>
                </tbody>
            </table>
            <form>
                <input></input>
            </form>
        </div>
}

export default StyleGuide