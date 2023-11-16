import {useState} from "react"
import './Header.css'
import { Link } from "react-router-dom";
import { getAddress } from 'sats-connect'
import tribeLogo from '../assets/tribe-logo.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet } from '@fortawesome/free-solid-svg-icons'

const Header = () => {
    const [addresses, setAddresses] = useState(null)
  
    const getAddressOptions = {
        payload: {
        purposes: ['ordinals', 'payment'],
        message: 'Address for receiving Ordinals and payments',
        network: {
            type:'Mainnet'
        },
        },
        onFinish: (response) => {
        console.log(response)
        setAddresses(response.addresses)
        },
        onCancel: () => alert('Request canceled'),
        };

  console.log(addresses)

  return (
    <div className="header-wrapper">
      <Link to='/' className="company-logo">
        <h1 className="company-name">Tribe</h1>
        <img className="company-img" src={tribeLogo} alt="Tribe logo" />
      </Link>
      <nav className="navbar">
        <Link className='navlinks' to='create'>create</Link>
        <Link className='navlinks' to='about'>about</Link>
        <button className='connect-wallet-btn' onClick={() => getAddress(getAddressOptions)}><FontAwesomeIcon icon={faWallet} /> connect wallet</button>
      </nav>
    </div>
  )
};

export default Header;
